// src/components/ReporterForm.jsx
import React, { useEffect, useState, useRef } from "react";
import eventBus from "../utils/eventBus";
import { 
  saveReport, 
  getUnattachedScreenshots,
  markScreenshotsAttached,
  saveScreenshotAttachment
} from "../services/pouchdbService";
import { saveLogFileAttachment } from "../services/logFileService";
import { screenshotStore } from "../stores/screenshotStore";
import { backendClient } from "../services/backendClient";
import { agentService } from "../services/agentService";
import AgentAutoInstaller from "./AgentAutoInstaller";

// ✨ Template imports
import TemplateSelector from "./TemplateSelector";
import DynamicField from "./DynamicField";
import TroubleshootingChecklist from "./TroubleshootingChecklist";
import { renderTemplateDescription } from "../data/templates";

// ✨ NEW: Auth hook (optional - user is passed as prop)
import { useAuth } from "../hooks/useAuth";

// ✨ MODIFIED: Accept user prop from parent
export default function ReporterForm({ onSubmit, user: userProp }) {
  // ✨ NEW: Get auth context (for getIdToken)
  const { getIdToken } = useAuth();

  // ============================================
  // ALL STATE DECLARATIONS (EXISTING + NEW)
  // ============================================
  
  // Form fields (EXISTING + MODIFIED)
  const [fullName, setFullName] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [category, setCategory] = useState("Pega Web Application");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  
  // ✨ NEW: Track if fields are auto-populated
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  
  // Screenshots (EXISTING)
  const [currentSessionScreenshots, setCurrentSessionScreenshots] = useState([]);
  const [tempScreenshotCount, setTempScreenshotCount] = useState(0);
  
  // Log files (EXISTING)
  const [attachedLogFiles, setAttachedLogFiles] = useState([]);
  const [autoCollecting, setAutoCollecting] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  
  // Agent state (EXISTING)
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [agentChecking, setAgentChecking] = useState(true);
  
  // Template state (EXISTING)
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFields, setTemplateFields] = useState({});
  const [templateErrors, setTemplateErrors] = useState({});
  const [checklistValues, setChecklistValues] = useState({});
  const [checklistErrors, setChecklistErrors] = useState({});
  
  // Refs (EXISTING)
  const fileInputRef = useRef(null);

  // ============================================
  // ✨ NEW: Auto-populate user info from Azure AD
  // ============================================
  
  useEffect(() => {
    if (userProp && !isAutoPopulated) {
      console.log('[ReporterForm] Auto-populating from Azure AD:', userProp);
      
      // Set full name
      if (userProp.name) {
        setFullName(userProp.name);
      }
      
      // Note: Supervisor would need to be fetched from Azure AD manager
      // For now, leave it empty or fetch it separately
      // If you have manager info in userProp, you can set it here:
      // setSupervisor(userProp.manager?.name || '');
      
      setIsAutoPopulated(true);
    }
  }, [userProp, isAutoPopulated]);

  // ============================================
  // EFFECTS (EXISTING)
  // ============================================

  // EXISTING: Check backend on mount
  useEffect(() => {
    async function checkBackend() {
      const available = await backendClient.healthCheck();
      setBackendAvailable(available);
      console.log('[ReporterForm] Backend service:', available ? 'Available ✅' : 'Not available ❌');
    }
    
    checkBackend();
  }, []);

  // EXISTING: Check agent on mount
  useEffect(() => {
    async function checkAgent() {
      setAgentChecking(true);
      const available = await agentService.checkAgent();
      setAgentAvailable(available);
      setAgentChecking(false);
      console.log('[ReporterForm] Agent service:', available ? 'Available ✅' : 'Not available ❌');
    }
    
    checkAgent();
  }, []);

  // EXISTING: Track screenshots captured in current session
  useEffect(() => {
    function handleCaptured() {
      loadCurrentScreenshots();
      setTempScreenshotCount(screenshotStore.count());
    }

    eventBus.on("capture-saved", handleCaptured);
    
    return () => eventBus.off("capture-saved", handleCaptured);
  }, []);

  // EXISTING: Listen for temp screenshot changes
  useEffect(() => {
    function handleTempChange(screenshots) {
      setTempScreenshotCount(screenshots.length);
    }

    eventBus.on("temp-screenshots-changed", handleTempChange);
    
    return () => eventBus.off("temp-screenshots-changed", handleTempChange);
  }, []);

  // EXISTING: Reset form when eventBus triggers
  useEffect(() => {
    function resetForm() {
      // ✨ MODIFIED: Don't reset name if auto-populated
      if (!isAutoPopulated) {
        setFullName("");
      } else if (userProp?.name) {
        setFullName(userProp.name);
      }
      
      setSupervisor("");
      setCategory("Pega Web Application");
      setDescription("");
      setAttachedLogFiles([]);
      loadCurrentScreenshots();
      setTempScreenshotCount(screenshotStore.count());
      
      // Reset template state
      setSelectedTemplate(null);
      setTemplateFields({});
      setTemplateErrors({});
      setChecklistValues({});
      setChecklistErrors({});
    }

    eventBus.on("reset-form", resetForm);
    return () => eventBus.off("reset-form", resetForm);
  }, [isAutoPopulated, userProp]);

  // EXISTING: Initial load
  useEffect(() => {
    loadCurrentScreenshots();
    setTempScreenshotCount(screenshotStore.count());
  }, []);

  // ============================================
  // HELPER FUNCTIONS (EXISTING)
  // ============================================

  // EXISTING: Load unattached screenshots only
  async function loadCurrentScreenshots() {
    const unattached = await getUnattachedScreenshots();
    setCurrentSessionScreenshots(unattached.map(s => s._id));
  }

  // EXISTING: Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ============================================
  // TEMPLATE HANDLERS (EXISTING)
  // ============================================

  // Template selection handler
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);

    // Set category if template has one
    if (template.category) {
      setCategory(template.category);
    }

    // Initialize fields with default values
    const initialFields = {};
    template.fields.forEach(field => {
      if (field.defaultValue) {
        initialFields[field.id] = typeof field.defaultValue === 'function' 
          ? field.defaultValue() 
          : field.defaultValue;
      }
    });
    setTemplateFields(initialFields);

    // Initialize checklist
    const initialChecklist = {};
    template.checklist.forEach(item => {
      initialChecklist[item.id] = false;
    });
    setChecklistValues(initialChecklist);

    // Clear errors
    setTemplateErrors({});
    setChecklistErrors({});

    console.log('[ReporterForm] Template selected:', template.name);
  };

  // Template field handler
  const handleTemplateFieldChange = (fieldId, value) => {
    setTemplateFields(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error when user types
    if (templateErrors[fieldId]) {
      setTemplateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Checklist handler
  const handleChecklistChange = (itemId, checked) => {
    setChecklistValues(prev => ({
      ...prev,
      [itemId]: checked
    }));

    // Clear error when checked
    if (checked && checklistErrors[itemId]) {
      setChecklistErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  // Validate template fields
  const validateTemplateFields = () => {
    if (!selectedTemplate) return true;

    const errors = {};
    let isValid = true;

    // Validate required fields
    selectedTemplate.fields.forEach(field => {
      if (field.required && !templateFields[field.id]) {
        errors[field.id] = 'This field is required';
        isValid = false;
      }

      // Custom validation
      if (field.validate && templateFields[field.id]) {
        const error = field.validate(templateFields[field.id]);
        if (error) {
          errors[field.id] = error;
          isValid = false;
        }
      }
    });

    // Validate required checklist items
    const checkErrors = {};
    selectedTemplate.checklist.forEach(item => {
      if (item.required && !checklistValues[item.id]) {
        checkErrors[item.id] = 'This step must be completed';
        isValid = false;
      }
    });

    setTemplateErrors(errors);
    setChecklistErrors(checkErrors);

    return isValid;
  };

  // ============================================
  // LOG FILE HANDLERS (EXISTING)
  // ============================================

  // Auto-collect log files from backend
  async function autoCollectLogFiles() {
    try {
      setAutoCollecting(true);
      console.log('[ReporterForm] Starting auto-collect via backend...');

      // Check if backend is available
      if (!backendAvailable) {
        const isAvailable = await backendClient.healthCheck();
        if (!isAvailable) {
          throw new Error('Backend service is not running. Please start the backend service first.');
        }
        setBackendAvailable(true);
      }

      // Request auto-collect from backend
      const result = await backendClient.autoCollectLogs();

      console.log('[ReporterForm] Auto-collect result:', {
        collected: result.collected.length,
        failed: result.failed.length
      });

      // Convert collected files to File objects
      if (result.collected.length > 0) {
        const newFiles = result.collected.map((item, index) => {
          const file = backendClient.createFileFromData(item.fileData);
          
          return {
            id: `auto_${Date.now()}_${index}`,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            autoCollected: true,
            sourcePath: item.name,
            configId: item.id,
            source: 'backend'
          };
        });

        setAttachedLogFiles(prev => [...prev, ...newFiles]);
        
        const successMsg = `✅ Auto-collected ${result.collected.length} log file(s) via Backend!`;
        alert(successMsg);
      }

      // Show errors if any
      if (result.failed.length > 0) {
        const errorMsg = result.failed
          .map(e => `• ${e.name}: ${e.error}`)
          .join('\n');
        
        console.warn('[ReporterForm] Auto-collect errors:', errorMsg);
        
        if (result.collected.length === 0) {
          alert(`❌ Could not collect log files:\n\n${errorMsg}\n\nPlease check:\n1. Backend service is running\n2. Log files exist\n3. File paths are correct`);
        } else {
          alert(`⚠️ Partially successful:\n${result.collected.length} collected, ${result.failed.length} failed\n\n${errorMsg}`);
        }
      }

      if (result.collected.length === 0 && result.failed.length === 0) {
        alert('ℹ️ No log files configured or all are disabled. Please check backend configuration.');
      }

    } catch (error) {
      console.error('[ReporterForm] Auto-collect error:', error);
      
      let errorMessage = error.message;
      
      if (errorMessage.includes('timeout') || errorMessage.includes('not running')) {
        errorMessage += '\n\nTo start the backend service:\n1. Open terminal in backend/ folder\n2. Run: npm install\n3. Run: npm start';
      }
      
      alert(`❌ Auto-collect failed:\n\n${errorMessage}`);
    } finally {
      setAutoCollecting(false);
    }
  }

  // Auto-collect log files from agent
  async function autoCollectFromAgent() {
    try {
      setAutoCollecting(true);
      console.log('[ReporterForm] Starting auto-collect via agent...');

      // Check if agent is available
      if (!agentAvailable) {
        const isAvailable = await agentService.checkAgent();
        if (!isAvailable) {
          throw new Error('Agent service is not running. Please install BLT Agent first.');
        }
        setAgentAvailable(true);
      }

      // Request auto-collect from agent
      const result = await agentService.collectLogFiles();

      console.log('[ReporterForm] Agent auto-collect result:', {
        files: result.files.length,
        errors: result.errors?.length || 0
      });

      // Add collected files to state
      if (result.files.length > 0) {
        const newFiles = result.files.map((file, index) => ({
          id: `agent_${Date.now()}_${index}`,
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          autoCollected: true,
          sourcePath: 'Agent collected',
          source: 'agent'
        }));

        setAttachedLogFiles(prev => [...prev, ...newFiles]);
        
        const successMsg = `✅ Auto-collected ${result.files.length} log file(s) via Agent!`;
        alert(successMsg);
      }

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors
          .map(e => `• ${e.path}: ${e.error}`)
          .join('\n');
        
        console.warn('[ReporterForm] Agent auto-collect errors:', errorMsg);
        
        if (result.files.length === 0) {
          alert(`❌ Could not collect log files:\n\n${errorMsg}`);
        } else {
          alert(`⚠️ Partially successful:\n${result.files.length} collected, ${result.errors.length} failed\n\n${errorMsg}`);
        }
      }

      if (result.files.length === 0 && (!result.errors || result.errors.length === 0)) {
        alert('ℹ️ No log files found. Please configure log paths in BLT Agent.');
      }

    } catch (error) {
      console.error('[ReporterForm] Agent auto-collect error:', error);
      alert(`❌ Auto-collect failed:\n\n${error.message}`);
    } finally {
      setAutoCollecting(false);
    }
  }

  // Handle manual log file selection
  function handleLogFileSelect(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    console.log('[ReporterForm] Log files selected:', files.length);

    // Add files to state
    const newFiles = files.map(file => ({
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      autoCollected: false,
      source: 'manual'
    }));

    setAttachedLogFiles(prev => [...prev, ...newFiles]);
    console.log('[ReporterForm] Total log files:', attachedLogFiles.length + newFiles.length);

    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Remove log file
  function removeLogFile(fileId) {
    setAttachedLogFiles(prev => prev.filter(f => f.id !== fileId));
    console.log('[ReporterForm] Log file removed:', fileId);
  }

  // ============================================
  // FORM SUBMIT (EXISTING + MODIFIED)
  // ============================================

  async function submit(e) {
    e.preventDefault();

    // Validate template fields first
    if (selectedTemplate && !validateTemplateFields()) {
      alert('❌ Please complete all required fields and checklist items');
      return;
    }

    try {
      setSaving(true);

      // Get temporary screenshots from store
      const tempScreenshots = screenshotStore.getAll();
      console.log('[ReporterForm] Temp screenshots:', tempScreenshots.length);
      console.log('[ReporterForm] PouchDB unattached screenshots:', currentSessionScreenshots.length);
      console.log('[ReporterForm] Attached log files:', attachedLogFiles.length);

      // Save temporary screenshots to PouchDB first
      const newScreenshotIds = [];
      for (const screenshot of tempScreenshots) {
        try {
          const id = await saveScreenshotAttachment(
            screenshot.metadata,
            screenshot.blob
          );
          newScreenshotIds.push(id);
          console.log('[ReporterForm] Saved temp screenshot to PouchDB:', id);
        } catch (error) {
          console.error('[ReporterForm] Error saving temp screenshot:', error);
        }
      }

      // Save log files to PouchDB
      const logFileIds = [];
      for (const logFileItem of attachedLogFiles) {
        try {
          const id = await saveLogFileAttachment(logFileItem.file, {
            originalPath: logFileItem.sourcePath || 'User uploaded',
            description: `Log file: ${logFileItem.name}`,
            autoCollected: logFileItem.autoCollected,
            configId: logFileItem.configId,
            source: logFileItem.source
          });
          logFileIds.push(id);
          console.log('[ReporterForm] Saved log file to PouchDB:', id);
        } catch (error) {
          console.error('[ReporterForm] Error saving log file:', error);
        }
      }

      // Combine: new screenshots + existing unattached screenshots
      const allScreenshotIds = [...newScreenshotIds, ...currentSessionScreenshots];

      console.log('[ReporterForm] Saving report with:');
      console.log('  - Screenshots:', allScreenshotIds.length);
      console.log('  - Log files:', logFileIds.length);

      // Generate description from template if used
      let finalDescription = description;
      if (selectedTemplate) {
        finalDescription = renderTemplateDescription(
          selectedTemplate,
          templateFields,
          checklistValues,
          description
        );
      }

      // ✨ NEW: Get ID token for backend validation
      let idToken = null;
      try {
        idToken = getIdToken();
      } catch (error) {
        console.warn('[ReporterForm] Could not get ID token:', error);
      }

      // Build report payload
      const payload = {
        reporter: {
          fullName,
          supervisor,
          // ✨ NEW: Include Azure AD user info
          azureAdUserId: userProp?.id || null,
          azureAdEmail: userProp?.email || null,
          azureAdName: userProp?.name || null
        },
        category,
        description: finalDescription,
        screenshots: allScreenshotIds,
        logFiles: logFileIds,
        createdAt: new Date().toISOString(),
        synced: false,
        metadata: {
          browser: navigator.userAgent,
          platform: navigator.platform,
          url: window.location.href,
          // ✨ NEW: Include authentication token for backend validation
          authToken: idToken,
          // Include template metadata
          template: selectedTemplate ? {
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            fields: templateFields,
            checklist: checklistValues
          } : null
        }
      };

      // Save report
      const reportId = await saveReport(payload);
      console.log('[ReporterForm] ✅ Report saved:', reportId);

      // Mark all screenshots as attached
      if (allScreenshotIds.length > 0) {
        await markScreenshotsAttached(allScreenshotIds, reportId);
        console.log('[ReporterForm] ✅ Screenshots marked as attached');
      }

      // Clear temporary screenshot store
      screenshotStore.clear();
      console.log('[ReporterForm] ✅ Cleared temporary screenshot store');

      // Notify
      eventBus.emit("report-added");

      // Show success
      alert(`✅ Report saved!\nID: ${reportId}\nScreenshots: ${allScreenshotIds.length}\nLog Files: ${logFileIds.length}`);

      // Reset form (but keep user info if auto-populated)
      if (!isAutoPopulated) {
        setFullName("");
      } else if (userProp?.name) {
        setFullName(userProp.name);
      }
      
      setSupervisor("");
      setCategory("Pega Web Application");
      setDescription("");
      setCurrentSessionScreenshots([]);
      setTempScreenshotCount(0);
      setAttachedLogFiles([]);
      
      // Reset template state
      setSelectedTemplate(null);
      setTemplateFields({});
      setTemplateErrors({});
      setChecklistValues({});
      setChecklistErrors({});
      
      // Reload unattached screenshots
      await loadCurrentScreenshots();

      // Notify parent
      if (onSubmit) {
        onSubmit({
          fullName,
          supervisor,
          category,
          description: finalDescription,
          reportId
        });
      }

    } catch (error) {
      console.error('[ReporterForm] ❌ Error saving report:', error);
      alert('❌ Failed to save report: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  // Calculate total screenshots
  const totalScreenshots = tempScreenshotCount + currentSessionScreenshots.length;

  // Determine which auto-collect service is available
  const hasElectron = !!window.electronAPI;
  const hasAgent = agentAvailable;
  const hasBackend = backendAvailable;
  const hasAnyAutoCollect = hasElectron || hasAgent || hasBackend;

  return (
    <div className="dashboard-box">
      {/* Agent Auto-Installer Modal */}
      {!hasElectron && <AgentAutoInstaller />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Create Report</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* ✨ NEW: Show logged-in user info */}
          {userProp && (
            <span style={{
              background: '#e3f2fd',
              color: '#0078d7',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              👤 {userProp.name}
            </span>
          )}
          {totalScreenshots > 0 && (
            <span style={{
              background: '#e3f2fd',
              color: '#0078d7',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              📷 {totalScreenshots} screenshot{totalScreenshots !== 1 ? 's' : ''}
              {tempScreenshotCount > 0 && currentSessionScreenshots.length > 0 && (
                <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '4px' }}>
                  ({tempScreenshotCount} new + {currentSessionScreenshots.length} existing)
                </span>
              )}
            </span>
          )}
          {attachedLogFiles.length > 0 && (
            <span style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              📄 {attachedLogFiles.length} log file{attachedLogFiles.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ✨ NEW: User info notice */}
      {isAutoPopulated && userProp && (
        <div style={{
          background: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#004085'
        }}>
          ℹ️ Your information has been automatically populated from your Azure AD profile
        </div>
      )}

      {/* Template Selector */}
      <TemplateSelector 
        onSelectTemplate={handleTemplateSelect}
        selectedTemplate={selectedTemplate}
      />

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Basic Fields */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Full Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            readOnly={isAutoPopulated} // ✨ NEW: Read-only if auto-populated
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isAutoPopulated ? '#f5f5f5' : 'white', // ✨ NEW: Visual indicator
              cursor: isAutoPopulated ? 'not-allowed' : 'text'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            Supervisor
          </label>
          <input
            type="text"
            placeholder="Enter supervisor name"
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Category (only if template doesn't set it) */}
        {(!selectedTemplate || !selectedTemplate.category) && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Category <span style={{ color: 'red' }}>*</span>
            </label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option>Pega Web Application</option>
              <option>Genesys Cloud</option>
              <option>Mobile</option>
              <option>Connectivity / VPN</option>
              <option>Other</option>
            </select>
          </div>
        )}

        {/* Template-specific fields */}
        {selectedTemplate && selectedTemplate.fields.length > 0 && (
          <div style={{
            border: '2px solid #667eea',
            borderRadius: '8px',
            padding: '16px',
            background: '#f8f9ff'
          }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#667eea', fontSize: '16px' }}>
              📋 Template Fields
            </h4>
            {selectedTemplate.fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={templateFields[field.id]}
                onChange={handleTemplateFieldChange}
                error={templateErrors[field.id]}
              />
            ))}
          </div>
        )}

        {/* Troubleshooting checklist */}
        {selectedTemplate && selectedTemplate.checklist.length > 0 && (
          <TroubleshootingChecklist
            checklist={selectedTemplate.checklist}
            values={checklistValues}
            onChange={handleChecklistChange}
            errors={checklistErrors}
          />
        )}

        {/* Description field */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
            {selectedTemplate ? 'Additional Notes (Optional)' : 'Description'} 
            {!selectedTemplate && <span style={{ color: 'red' }}>*</span>}
          </label>
          <textarea
            placeholder={selectedTemplate 
              ? "Add any additional details not covered by the template..."
              : "Describe the issue, steps to reproduce, expected vs actual outcome…"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required={!selectedTemplate}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          {selectedTemplate && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              💡 The template fields above will be automatically formatted into the description
            </div>
          )}
        </div>

        {/* Log File Attachment Section */}
        <div style={{
          border: '2px dashed #ddd',
          borderRadius: '8px',
          padding: '16px',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontWeight: '500', fontSize: '14px', color: '#333' }}>
              📎 Attach Log Files (Optional)
            </label>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Auto-Collect Buttons */}
              {hasAnyAutoCollect ? (
                <>
                  {/* Electron Auto-Collect */}
                  {hasElectron && (
                    <button
                      type="button"
                      onClick={autoCollectLogFiles}
                      disabled={autoCollecting}
                      style={{
                        padding: '8px 16px',
                        background: autoCollecting ? '#ccc' : '#6f42c1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: autoCollecting ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {autoCollecting ? <>⏳ Collecting...</> : <>🖥️ Auto-Collect (Desktop)</>}
                    </button>
                  )}

                  {/* Agent Auto-Collect */}
                  {hasAgent && !hasElectron && (
                    <button
                      type="button"
                      onClick={autoCollectFromAgent}
                      disabled={autoCollecting}
                      style={{
                        padding: '8px 16px',
                        background: autoCollecting ? '#ccc' : '#0078d7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: autoCollecting ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {autoCollecting ? <>⏳ Collecting...</> : <>🤖 Auto-Collect (Agent)</>}
                    </button>
                  )}

                  {/* Backend Auto-Collect */}
                  {hasBackend && !hasElectron && !hasAgent && (
                    <button
                      type="button"
                      onClick={autoCollectLogFiles}
                      disabled={autoCollecting}
                      style={{
                        padding: '8px 16px',
                        background: autoCollecting ? '#ccc' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: autoCollecting ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {autoCollecting ? <>⏳ Collecting...</> : <>🔄 Auto-Collect (Backend)</>}
                    </button>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '8px 16px',
                  background: '#fff3cd',
                  color: '#856404',
                  border: '1px solid #ffc107',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  💡 Install Desktop App or Agent for auto-collect
                </div>
              )}

              {/* Manual Browse Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.json"
                multiple
                onChange={handleLogFileSelect}
                style={{ display: 'none' }}
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📁 Browse Files
              </button>
            </div>
          </div>

          {/* Service status indicator */}
          {!agentChecking && (
            <div style={{ 
              fontSize: '12px', 
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: '#f8f9fa'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#333' }}>
                Auto-Collect Services:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                {hasElectron && (
                  <div style={{ color: '#155724' }}>
                    ✅ <strong>Desktop App</strong> - Electron native file access
                  </div>
                )}
                {hasAgent && (
                  <div style={{ color: '#155724' }}>
                    ✅ <strong>BLT Agent</strong> - Background service active
                  </div>
                )}
                {hasBackend && (
                  <div style={{ color: '#155724' }}>
                    ✅ <strong>Backend Service</strong> - Node.js service active
                  </div>
                )}
                {!hasAnyAutoCollect && (
                  <div style={{ color: '#856404' }}>
                    ❌ No auto-collect service available - Use "Browse Files" for manual selection
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attached Log Files List */}
          {attachedLogFiles.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              {attachedLogFiles.map((logFile) => (
                <div
                  key={logFile.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'white',
                    border: logFile.autoCollected ? '2px solid #0078d7' : '1px solid #ddd',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#333', 
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📄 {logFile.name}
                      {logFile.autoCollected && (
                        <span style={{
                          background: logFile.source === 'agent' ? '#0078d7' : 
                                     logFile.source === 'backend' ? '#17a2b8' : '#6f42c1',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {logFile.source === 'agent' ? 'AGENT' : 
                           logFile.source === 'backend' ? 'BACKEND' : 'AUTO'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatFileSize(logFile.size)}
                      {logFile.sourcePath && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>
                          • {logFile.sourcePath}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeLogFile(logFile.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachedLogFiles.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#999',
              fontSize: '13px'
            }}>
              No log files attached. {hasAnyAutoCollect ? 'Click "Auto-Collect" or "Browse Files".' : 'Click "Browse Files".'}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={saving}
          style={{
            padding: '10px 20px',
            background: saving ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {saving ? '💾 Saving...' : '💾 Save Offline'}
        </button>

        <button onClick={() => {
          fetch("http://localhost:42080/api/run-capture")
            .then(r => r.json())
            .then(r => console.log("Response:", r));
        }}>
          Run Screen Capture
        </button>

        {/* Summary Text */}
        <p style={{ 
          fontSize: '12px', 
          color: '#666', 
          margin: '0',
          textAlign: 'center' 
        }}>
          {totalScreenshots > 0 || attachedLogFiles.length > 0
            ? `Report will include ${totalScreenshots} screenshot${totalScreenshots !== 1 ? 's' : ''} and ${attachedLogFiles.length} log file${attachedLogFiles.length !== 1 ? 's' : ''}`
            : 'Capture screenshots or attach log files before saving'
          }
        </p>
      </form>
    </div>
  );
}