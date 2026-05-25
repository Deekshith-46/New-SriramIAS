/**
 * Master permission modules — single source of truth for RBAC matrix.
 * Add new modules/features here; run sync on server start for existing roles.
 */
module.exports = [
  {
    moduleKey: 'ACADEMICS',
    moduleTitle: 'Academics',
    features: [
      'Student Management',
      'Course Management',
      'Batch Management',
      'Live Classes',
      'Assignments',
      'Attendance',
      'Exams',
      'Results',
      'Faculty Management',
      'Study Materials'
    ]
  },
  {
    moduleKey: 'USERS_ACCESS',
    moduleTitle: 'Users & Access',
    features: [
      'User Creation',
      'Admin Creation',
      'Role Assignment',
      'Wallet Management',
      'Coupons',
      'Access Control',
      'Permission Editing'
    ]
  },
  {
    moduleKey: 'ENGAGEMENT_CRM',
    moduleTitle: 'Engagement & CRM',
    features: [
      'Leads',
      'Enquiries',
      'Notifications',
      'Help Desk',
      'Campaign Tracking',
      'Follow Ups'
    ]
  },
  {
    moduleKey: 'CONTENT_MARKETING',
    moduleTitle: 'Content & Marketing',
    features: [
      'Blog Management',
      'Free Resources',
      'Current Affairs',
      'Banner Management',
      'Campaigns',
      'SEO Content',
      'Media Uploads'
    ]
  },
  {
    moduleKey: 'OPERATIONS',
    moduleTitle: 'Operations',
    features: [
      'User Workflow',
      'Reports & Analytics',
      'Configurations',
      'Audit Logs',
      'Operational Tasks',
      'Team Assignments',
      'Process Tracking',
      'Data Monitoring',
      'Approval Management',
      'Internal Escalations'
    ]
  },
  {
    moduleKey: 'SYSTEM_TOOLS',
    moduleTitle: 'System Tools',
    features: [
      'Logs',
      'Database Access',
      'Integrations',
      'Platform Settings',
      'Backup Control',
      'API Settings'
    ]
  }
];
