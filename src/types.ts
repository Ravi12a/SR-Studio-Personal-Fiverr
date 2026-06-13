export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'buyer';
  createdAt: any;
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryTime: number; // in days
  images: string[];
  features: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Order {
  id: string;
  clientId: string;
  gigId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectTitle: string;
  projectDescription: string;
  additionalRequirements?: string;
  fileUrl?: string; // Initial requirements upload
  status: 'Pending Payment Verification' | 'In Progress' | 'Revision Requested' | 'Delivered' | 'Completed' | 'Cancelled';
  amount: number;
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id: string;
  orderId: string;
  clientId: string;
  transactionId: string;
  screenshotUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: any;
}

export interface Delivery {
  id: string;
  orderId: string;
  fileUrls: string[];
  message?: string;
  createdAt: any;
}

export interface Testimonial {
  id: string;
  clientName: string;
  content: string;
  rating: number;
  projectId?: string;
  featured: boolean;
  createdAt: any;
}
