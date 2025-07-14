import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Document, Approver, ExternalSigner, StatusUpdate } from '../types';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Edit, Save } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [signers, setSigners] = useState<ExternalSigner[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignerId, setEditingSignerId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<'signed' | 'rejected'>('signed');
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchDocumentDetails();
    }
  }, [id]);

  const fetchDocumentDetails = async () => {
    try {
      // Fetch document
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          creator:users!documents_created_by_fkey(full_name, employee_code)
        `)
        .eq('id', id)
        .single();

      if (docError) throw docError;
      setDocument(docData);

      // Fetch approvers
      const { data: approversData, error: approversError } = await supabase
        .from('approvers')
        .select(`
          *,
          user:users(full_name, employee_code)
        `)
        .eq('document_id', id)
        .order('order');

      if (approversError) throw approversError;
      setApprovers(approversData || []);

      // Fetch external signers
      const { data: signersData, error: signersError } = await supabase
        .from('external_signers')
        .select('*')
        .eq('document_id', id)
        .order('order');

      if (signersError) throw signersError;
      setSigners(signersData || []);

      // Fetch status updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('status_updates')
        .select(`
          *,
          user:users(full_name, employee_code)
        `)
        .eq('document_id', id)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setStatusUpdates(updatesData || []);

    } catch (error) {
      console.error('Error fetching document details:', error);
      toast.error('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  const updateSignerStatus = async (signerId: string, status: 'signed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('external_signers')
        .update({
          status,
          signed_at: status === 'signed' ? new Date().toISOString() : null,
          comments: updateMessage,
        })
        .eq('id', signerId);

      if (error) throw error;

      // Add status update
      await supabase
        .from('status_updates')
        .insert({
          document_id: id,
          updated_by: user?.id,
          update_type: status === 'signed' ? 'signature_received' : 'rejected',
          message: updateMessage || `Signature ${status}`,
        });

      // Check if all signers are done and update document status
      const updatedSigners = signers.map(s => 
        s.id === signerId ? { ...s, status } : s
      );
      
      const allSigned = updatedSigners.every(s => s.status === 'signed');
      const anyRejected = updatedSigners.some(s => s.status === 'rejected');

      if (allSigned) {
        await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', id);
      } else if (anyRejected) {
        await supabase
          .from('documents')
          .update({ status: 'rejected' })
          .eq('id', id);
      }

      setEditingSignerId(null);
      setUpdateMessage('');
      fetchDocumentDetails();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating signer status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Document not found</h2>
          <p className="text-gray-600 mt-2">The document you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const canUpdateStatus = user?.id === document.created_by || user?.is_admin;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>

        {/* Document Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                <p className="text-gray-600 mt-2">{document.description}</p>
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Created by: {document.creator?.full_name}</span>
                  <span>•</span>
                  <span>{format(new Date(document.created_at), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  document.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  document.status === 'approved' ? 'bg-green-100 text-green-800' :
                  document.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  document.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {document.status.replace('_', ' ')}
                </span>
                <a
                  href={document.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  View Document
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approvers */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Internal Approvers</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {approvers.map((approver, index) => (
                  <div key={approver.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600 mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{approver.user?.full_name}</p>
                        <p className="text-sm text-gray-500">Employee: {approver.user?.employee_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(approver.status)}
                      <span className="ml-2 text-sm font-medium capitalize">
                        {approver.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* External Signers */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">External Signers</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {signers.map((signer, index) => (
                  <div key={signer.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600 mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{signer.name}</p>
                          <p className="text-sm text-gray-500">{signer.designation}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(signer.status)}
                        <span className="text-sm font-medium capitalize">
                          {signer.status}
                        </span>
                        {canUpdateStatus && signer.status === 'pending' && (
                          <button
                            onClick={() => setEditingSignerId(signer.id)}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {editingSignerId === signer.id && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Update Status
                          </label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as 'signed' | 'rejected')}
                            className="mt-1 input-field"
                          >
                            <option value="signed">Signed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Comments (optional)
                          </label>
                          <textarea
                            value={updateMessage}
                            onChange={(e) => setUpdateMessage(e.target.value)}
                            className="mt-1 input-field"
                            rows={2}
                            placeholder="Add any comments..."
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateSignerStatus(signer.id, newStatus)}
                            className="btn-primary flex items-center"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Update
                          </button>
                          <button
                            onClick={() => {
                              setEditingSignerId(null);
                              setUpdateMessage('');
                            }}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status Updates */}
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Status Updates</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {statusUpdates.map((update) => (
                <div key={update.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 text-sm font-medium">
                        {update.user?.full_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{update.user?.full_name}</span>
                      {' '}{update.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(update.created_at), 'MMM dd, yyyy - h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetails;