// src/data/templates.js

export const bugReportTemplates = [
    {
      id: 'vpn-connection',
      name: 'VPN Connection Issue',
      icon: '🔐',
      description: 'Report GlobalProtect VPN connectivity problems',
      category: 'Connectivity / VPN',
      
      fields: [
        {
          id: 'vpn_server',
          label: 'VPN Server',
          type: 'select',
          required: true,
          options: [
            'US East (us-east.vpn.company.com)',
            'US West (us-west.vpn.company.com)',
            'EU Central (eu-central.vpn.company.com)',
            'APAC (apac.vpn.company.com)',
            'Other'
          ],
          placeholder: 'Select VPN server you were connecting to'
        },
        {
          id: 'error_message',
          label: 'Error Message',
          type: 'textarea',
          required: true,
          rows: 3,
          placeholder: 'Copy and paste the exact error message displayed'
        },
        {
          id: 'connection_time',
          label: 'When did this occur?',
          type: 'datetime-local',
          required: true,
          defaultValue: () => new Date().toISOString().slice(0, 16)
        },
        {
          id: 'internet_status',
          label: 'Internet Connection',
          type: 'radio',
          required: true,
          options: [
            'Working normally (can access other websites)',
            'Intermittent (some sites work, some don\'t)',
            'Not working at all'
          ]
        }
      ],
  
      checklist: [
        {
          id: 'tried_reconnect',
          label: 'Tried disconnecting and reconnecting to VPN',
          required: true
        },
        {
          id: 'restarted_vpn',
          label: 'Restarted GlobalProtect application',
          required: true
        },
        {
          id: 'restarted_pc',
          label: 'Restarted computer',
          required: false
        },
        {
          id: 'tried_different_server',
          label: 'Tried connecting to a different VPN server',
          required: false
        }
      ],
  
      autoCollectLogs: [
        'C:\\Program Files\\Palo Alto Networks\\GlobalProtect\\PanGPS.log',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\Palo Alto Networks\\GlobalProtect\\PanGPA.log'
      ],
  
      autoDiagnostics: true,
  
      descriptionTemplate: `**VPN Connection Issue Report**
  
  **Server:** {{vpn_server}}
  **Error Message:** {{error_message}}
  **Occurred At:** {{connection_time}}
  **Internet Status:** {{internet_status}}
  
  **Troubleshooting Steps Completed:**
  {{checklist}}
  
  **Additional Details:**
  {{description}}`
    },
  
    {
      id: 'pega-error',
      name: 'Pega Application Error',
      icon: '🌐',
      description: 'Report errors in Pega Web Application',
      category: 'Pega Web Application',
  
      fields: [
        {
          id: 'page_url',
          label: 'Page URL',
          type: 'text',
          required: true,
          placeholder: 'https://pega.company.com/...',
          validate: (value) => {
            if (!value.includes('pega.company.com')) {
              return 'Please enter a valid Pega URL';
            }
            return null;
          }
        },
        {
          id: 'error_type',
          label: 'Error Type',
          type: 'select',
          required: true,
          options: [
            'Application crashed/frozen',
            'Error message displayed',
            'Page not loading',
            'Data not saving',
            'Unexpected behavior',
            'Performance issue (slow)',
            'Other'
          ]
        },
        {
          id: 'browser',
          label: 'Browser',
          type: 'select',
          required: true,
          options: ['Chrome', 'Edge', 'Firefox', 'Safari'],
          defaultValue: () => {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Edg')) return 'Edge';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari')) return 'Safari';
            return 'Chrome';
          }
        },
        {
          id: 'steps_to_reproduce',
          label: 'Steps to Reproduce',
          type: 'textarea',
          required: true,
          rows: 5,
          placeholder: '1. Navigate to...\n2. Click on...\n3. Enter...\n4. Error occurs'
        },
        {
          id: 'expected_result',
          label: 'Expected Result',
          type: 'textarea',
          required: true,
          rows: 2,
          placeholder: 'What should have happened?'
        },
        {
          id: 'actual_result',
          label: 'Actual Result',
          type: 'textarea',
          required: true,
          rows: 2,
          placeholder: 'What actually happened?'
        }
      ],
  
      checklist: [
        {
          id: 'cleared_cache',
          label: 'Cleared browser cache and cookies',
          required: true
        },
        {
          id: 'tried_different_browser',
          label: 'Tried in a different browser',
          required: true
        },
        {
          id: 'refreshed_page',
          label: 'Refreshed the page (F5)',
          required: true
        },
        {
          id: 'checked_console',
          label: 'Checked browser console for errors (F12)',
          required: false
        }
      ],
  
      autoCollectLogs: [],
      autoDiagnostics: false,
  
      descriptionTemplate: `**Pega Application Error**
  
  **Page URL:** {{page_url}}
  **Error Type:** {{error_type}}
  **Browser:** {{browser}}
  
  **Steps to Reproduce:**
  {{steps_to_reproduce}}
  
  **Expected Result:**
  {{expected_result}}
  
  **Actual Result:**
  {{actual_result}}
  
  **Troubleshooting Completed:**
  {{checklist}}
  
  **Additional Notes:**
  {{description}}`
    },
  
    {
      id: 'genesys-cloud',
      name: 'Genesys Cloud Issue',
      icon: '☁️',
      description: 'Report Genesys Cloud platform issues',
      category: 'Genesys Cloud',
  
      fields: [
        {
          id: 'issue_type',
          label: 'Issue Type',
          type: 'select',
          required: true,
          options: [
            'Cannot make/receive calls',
            'Audio quality problems',
            'Call disconnections',
            'Unable to transfer calls',
            'Screen pop not working',
            'Status not updating',
            'Other'
          ]
        },
        {
          id: 'extension',
          label: 'Your Extension Number',
          type: 'text',
          required: true,
          placeholder: 'e.g., 5001'
        },
        {
          id: 'call_id',
          label: 'Call ID (if applicable)',
          type: 'text',
          required: false,
          placeholder: 'Found in call history'
        },
        {
          id: 'customer_impact',
          label: 'Customer Impact',
          type: 'radio',
          required: true,
          options: [
            'Cannot serve customers (critical)',
            'Degraded service quality',
            'Minor inconvenience'
          ]
        }
      ],
  
      checklist: [
        {
          id: 'checked_internet',
          label: 'Verified internet connection is stable',
          required: true
        },
        {
          id: 'refreshed_genesys',
          label: 'Refreshed Genesys Cloud application',
          required: true
        },
        {
          id: 'checked_headset',
          label: 'Checked headset/microphone connections',
          required: true
        },
        {
          id: 'relogged',
          label: 'Logged out and logged back in',
          required: false
        }
      ],
  
      autoCollectLogs: [],
      autoDiagnostics: true,
  
      descriptionTemplate: `**Genesys Cloud Issue**
  
  **Issue Type:** {{issue_type}}
  **Extension:** {{extension}}
  **Call ID:** {{call_id}}
  **Customer Impact:** {{customer_impact}}
  
  **Troubleshooting Done:**
  {{checklist}}
  
  **Additional Information:**
  {{description}}`
    },
  
    {
      id: 'mobile-crash',
      name: 'Mobile App Crash',
      icon: '📱',
      description: 'Report mobile application crashes or errors',
      category: 'Mobile',
  
      fields: [
        {
          id: 'device_model',
          label: 'Device Model',
          type: 'text',
          required: true,
          placeholder: 'e.g., iPhone 14 Pro, Samsung Galaxy S23'
        },
        {
          id: 'os_version',
          label: 'OS Version',
          type: 'text',
          required: true,
          placeholder: 'e.g., iOS 17.2, Android 14'
        },
        {
          id: 'app_version',
          label: 'App Version',
          type: 'text',
          required: true,
          placeholder: 'Found in Settings > About'
        },
        {
          id: 'crash_frequency',
          label: 'How Often Does This Happen?',
          type: 'radio',
          required: true,
          options: [
            'Every time (100%)',
            'Frequently (>50%)',
            'Occasionally (<50%)',
            'First time'
          ]
        },
        {
          id: 'before_crash',
          label: 'What Were You Doing When It Crashed?',
          type: 'textarea',
          required: true,
          rows: 4,
          placeholder: 'Describe the steps leading to the crash'
        }
      ],
  
      checklist: [
        {
          id: 'updated_app',
          label: 'App is updated to latest version',
          required: true
        },
        {
          id: 'restarted_app',
          label: 'Force closed and restarted the app',
          required: true
        },
        {
          id: 'restarted_device',
          label: 'Restarted the device',
          required: false
        },
        {
          id: 'reinstalled',
          label: 'Uninstalled and reinstalled the app',
          required: false
        }
      ],
  
      autoCollectLogs: [],
      autoDiagnostics: false,
  
      descriptionTemplate: `**Mobile App Crash Report**
  
  **Device:** {{device_model}}
  **OS Version:** {{os_version}}
  **App Version:** {{app_version}}
  **Frequency:** {{crash_frequency}}
  
  **What Happened Before Crash:**
  {{before_crash}}
  
  **Troubleshooting Steps:**
  {{checklist}}
  
  **Additional Details:**
  {{description}}`
    },
  
    {
      id: 'generic',
      name: 'General Issue',
      icon: '📝',
      description: 'Report any other issue not covered by templates',
      category: null, // User must select
  
      fields: [
        {
          id: 'issue_summary',
          label: 'Issue Summary',
          type: 'text',
          required: true,
          placeholder: 'Brief one-line description of the issue'
        }
      ],
  
      checklist: [],
      autoCollectLogs: [],
      autoDiagnostics: false,
  
      descriptionTemplate: `{{description}}`
    }
  ];
  
  // Helper function to get template by ID
  export function getTemplateById(id) {
    return bugReportTemplates.find(t => t.id === id);
  }
  
  // Helper function to render template description with values
  export function renderTemplateDescription(template, fieldValues, checklistValues, additionalDescription) {
    let description = template.descriptionTemplate;
  
    // Replace field placeholders
    Object.keys(fieldValues).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = fieldValues[key] || '[Not provided]';
      description = description.replace(placeholder, value);
    });
  
    // Replace checklist placeholder
    if (checklistValues && Object.keys(checklistValues).length > 0) {
      const checklistText = template.checklist
        .map(item => `- [${checklistValues[item.id] ? 'x' : ' '}] ${item.label}`)
        .join('\n');
      description = description.replace('{{checklist}}', checklistText);
    }
  
    // Replace additional description
    description = description.replace('{{description}}', additionalDescription || '');
  
    return description;
  }