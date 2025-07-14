export interface User {
  id: string;
  email: string;
  employee_code: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  document_url: string;
  created_by: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  creator?: User;
}

export interface Approver {
  id: string;
  document_id: string;
  user_id: string;
  order: number;
  status: ApprovalStatus;
  comments?: string;
  approved_at?: string;
  user?: User;
}

export interface ExternalSigner {
  id: string;
  document_id: string;
  name: string;
  designation: string;
  order: number;
  status: SigningStatus;
  signed_at?: string;
  comments?: string;
}

export interface StatusUpdate {
  id: string;
  document_id: string;
  updated_by: string;
  update_type: UpdateType;
  message: string;
  created_at: string;
  user?: User;
}

export type DocumentStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected';

export type SigningStatus = 
  | 'pending'
  | 'signed'
  | 'rejected';

export type UpdateType = 
  | 'created'
  | 'approved'
  | 'rejected'
  | 'signing_started'
  | 'signature_received'
  | 'completed'
  | 'general_update';

export interface DocumentFormData {
  title: string;
  description: string;
  document_file: File;
  approvers: string[];
  external_signers: {
    name: string;
    designation: string;
  }[];
}