import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Document, Approver } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingDocuments, setPendingDocuments] = useState<(Document & { approvers: Approver[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      // Fetch documents that need approval from this admin
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          creator:users!documents_created_by_fkey(full_name, employee_code),
          approvers!inner(
            *,
            user:users(full_name, employee_code)
          )
        `)
        .eq('approvers.user_id', user?.id)
        .eq('approvers.status', 'pending')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingDocuments(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (documentId: string, approverId: string, status: 'approved' | 'rejected', comments?: string) => {
    try {
      // Update approver status
      const { error: approverError } = await supabase
        .from('approvers')
        .update({
          status,
          comments,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', approverId);

      if (approverError) throw approverError;

      // Check if all approvers have responded
      const { data: allApprovers, error: fetchError } = await supabase
        .from('approvers')
        .select('status')
        .eq('document_id', documentId);

      if (fetchError) throw fetchError;

      const allApproved = allApprovers.every(a => a.status === 'approved');
      const anyRejected = allApprovers.some(a => a.status === 'rejected');

      let newDocumentStatus: 'approved' | 'rejected' | 'pending_approval' = 'pending_approval';
      let updateMessage = `Document ${status} by ${user?.full_name}`;

      if (anyRejected) {
        newDocumentStatus = 'rejected';
        updateMessage = 'Document rejected by one or more approvers';
      } else if (allApproved) {
        newDocumentStatus = 'approved';
        updateMessage = 'Document approved by all approvers and ready for signing';
      }

      // Update document status if all approvers responded
      if (newDocumentStatus !== 'pending_approval') {
        const { error: docError } = await supabase
          .from('documents')
          .update({ 
            status: newDocumentStatus === 'approved' ? 'in_progress' : 'rejected'
          })
          .eq('id', documentId);

        if (docError) throw docError;
      }

      // Add status update
      await supabase
        .from('status_updates')
        .insert({
          document_id: documentId,
          updated_by: user?.id,
          update_type: status,
          message: comments || updateMessage,
        });

      toast.success(`Document ${status} successfully`);
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval');
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Pending Approvals</h1>
            <p className="text-sm text-gray-600">
              Documents waiting for your approval as an admin
            </p>
          </div>

          <div className="p-6">
            {pendingDocuments.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">
                  No documents are currently waiting for your approval.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingDocuments.map((document) => (
                  <ApprovalCard
                    key={document.id}
                    document={document}
                    onApprove={(comments) => {
                      const approver = document.approvers.find(a => a.user_id === user?.id);
                      if (approver) {
                        handleApproval(document.id, approver.id, 'approved', comments);
                      }
                    }}
                    onReject={(comments) => {
                      const approver = document.approvers.find(a => a.user_id === user?.id);
                      if (approver) {
                        handleApproval(document.id, approver.id, 'rejected', comments);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ApprovalCardProps {
  document: Document & { approvers: Approver[] };
  onApprove: (comments?: string) => void;
  onReject: (comments?: string) => void;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({ document, onApprove, onReject }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = () => {
    if (actionType === 'approve') {
      onApprove(comments);
    } else if (actionType === 'reject') {
      onReject(comments);
    }
    setShowComments(false);
    setComments('');
    setActionType(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">{document.title}</h3>
          </div>
          <p className="text-gray-600 mb-4">{document.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Created by:</span> {document.creator?.full_name}
            </div>
            <div>
              <span className="font-medium">Employee Code:</span> {document.creator?.employee_code}
            </div>
            <div>
              <span className="font-medium">Created:</span> {format(new Date(document.created_at), 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-2">Status:</span>
              <span className="inline-flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                Pending Approval
              </span>
            </div>
          </div>

          <div className="mt-4">
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

        <div className="ml-6 flex-shrink-0">
          {!showComments ? (
            <div className="space-y-2">
              <button
                onClick={() => {
                  setActionType('approve');
                  setShowComments(true);
                }}
                className="w-full btn-primary flex items-center justify-center"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </button>
              <button
                onClick={() => {
                  setActionType('reject');
                  setShowComments(true);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </button>
            </div>
          ) : (
            <div className="w-64 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder={`Add ${actionType === 'approve' ? 'approval' : 'rejection'} comments...`}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSubmit}
                  className={`flex-1 font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
                </button>
                <button
                  onClick={() => {
                    setShowComments(false);
                    setComments('');
                    setActionType(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;