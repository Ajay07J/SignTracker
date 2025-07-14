import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase, uploadFile, getFileUrl } from '../lib/supabase';
import { User } from '../types';
import { Upload, Plus, Trash2, ArrowLeft } from 'lucide-react';

const createDocumentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  approvers: z.array(z.string()).min(1, 'At least one approver is required'),
  external_signers: z.array(z.object({
    name: z.string().min(2, 'Name is required'),
    designation: z.string().min(2, 'Designation is required'),
  })).min(1, 'At least one external signer is required'),
});

type CreateDocumentFormData = z.infer<typeof createDocumentSchema>;

const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDocumentFormData>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      external_signers: [{ name: '', designation: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'external_signers',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_admin', true);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error('Please upload a PDF or image file');
        return;
      }

      if (selectedFile.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const onSubmit = async (data: CreateDocumentFormData) => {
    if (!file) {
      toast.error('Please select a document file');
      return;
    }

    try {
      setLoading(true);

      // Upload file to Supabase storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `documents/${fileName}`;
      
      await uploadFile(file, 'documents', filePath);
      const fileUrl = getFileUrl('documents', filePath);

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: data.title,
          description: data.description,
          document_url: fileUrl,
          created_by: user?.id,
          status: 'pending_approval',
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create approver records
      const approverRecords = data.approvers.map((approverId, index) => ({
        document_id: document.id,
        user_id: approverId,
        order: index + 1,
        status: 'pending' as const,
      }));

      const { error: approverError } = await supabase
        .from('approvers')
        .insert(approverRecords);

      if (approverError) throw approverError;

      // Create external signer records
      const signerRecords = data.external_signers.map((signer, index) => ({
        document_id: document.id,
        name: signer.name,
        designation: signer.designation,
        order: index + 1,
        status: 'pending' as const,
      }));

      const { error: signerError } = await supabase
        .from('external_signers')
        .insert(signerRecords);

      if (signerError) throw signerError;

      // Create status update
      await supabase
        .from('status_updates')
        .insert({
          document_id: document.id,
          updated_by: user?.id,
          update_type: 'created',
          message: 'Document created and submitted for approval',
        });

      toast.success('Document created successfully!');
      navigate(`/document/${document.id}`);
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast.error(error.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Create New Document</h1>
            <p className="text-sm text-gray-600">
              Submit a new document for approval and tracking
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Document Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Document Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="mt-1 input-field"
                  placeholder="Enter document title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 input-field"
                  placeholder="Describe the document and its purpose"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Document File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, PNG, JPG up to 5MB
                    </p>
                    {file && (
                      <p className="text-sm text-green-600">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Approvers */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Internal Approvers</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Approvers (Admin Users)
                </label>
                <select
                  {...register('approvers')}
                  multiple
                  className="mt-1 input-field"
                  size={Math.min(users.length, 4)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.employee_code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Hold Ctrl/Cmd to select multiple approvers
                </p>
                {errors.approvers && (
                  <p className="mt-1 text-sm text-red-600">{errors.approvers.message}</p>
                )}
              </div>
            </div>

            {/* External Signers */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">External Signers</h2>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex space-x-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      {...register(`external_signers.${index}.name`)}
                      type="text"
                      className="mt-1 input-field"
                      placeholder="Full name"
                    />
                    {errors.external_signers?.[index]?.name && (
                      <p className="text-sm text-red-600">
                        {errors.external_signers[index]?.name?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      {...register(`external_signers.${index}.designation`)}
                      type="text"
                      className="mt-1 input-field"
                      placeholder="Position/Title"
                    />
                    {errors.external_signers?.[index]?.designation && (
                      <p className="text-sm text-red-600">
                        {errors.external_signers[index]?.designation?.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="btn-secondary p-2 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => append({ name: '', designation: '' })}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Signer
              </button>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDocument;