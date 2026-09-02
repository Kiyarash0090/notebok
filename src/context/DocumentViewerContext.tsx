import React, { createContext, useContext, useState } from 'react';
import { NoteAttachment } from '../types';
import { isOfficeFile, isViewableDocument } from '../lib/fileViewerUtils';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

interface DocumentViewerContextType {
  activeAttachment: NoteAttachment | null;
  openDocument: (
    att: NoteAttachment,
    onSave?: (updatedAtt: NoteAttachment, newContent: string) => void
  ) => void;
  closeDocument: () => void;
}

const DocumentViewerContext = createContext<DocumentViewerContextType>({
  activeAttachment: null,
  openDocument: () => {},
  closeDocument: () => {},
});

export const DocumentViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAttachment, setActiveAttachment] = useState<NoteAttachment | null>(null);
  const [onSaveCallback, setOnSaveCallback] = useState<
    ((updatedAtt: NoteAttachment, newContent: string) => void) | null
  >(null);

  const openDocument = (
    att: NoteAttachment,
    onSave?: (updatedAtt: NoteAttachment, newContent: string) => void
  ) => {
    // CRITICAL REQUIREMENT: Office files (.doc, .docx, .xls, .xlsx, .ppt, .pptx) MUST NOT open in any modal!
    // If it's an office file, trigger direct file download immediately.
    if (isOfficeFile(att.name)) {
      const a = document.createElement('a');
      a.href = att.url;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Only open modal if it is a viewable document type (PDF, TXT, CODE, MD)
    if (isViewableDocument(att.name)) {
      setActiveAttachment(att);
      setOnSaveCallback(onSave ? () => onSave : null);
    } else {
      // Fallback: direct download for unknown binary types
      const a = document.createElement('a');
      a.href = att.url;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const closeDocument = () => {
    setActiveAttachment(null);
    setOnSaveCallback(null);
  };

  const handleSaveAttachment = (updatedAtt: NoteAttachment, newContent: string) => {
    setActiveAttachment(updatedAtt);
    if (onSaveCallback) {
      onSaveCallback(updatedAtt, newContent);
    }
  };

  return (
    <DocumentViewerContext.Provider value={{ activeAttachment, openDocument, closeDocument }}>
      {children}
      {activeAttachment && (
        <DocumentViewerModal
          attachment={activeAttachment}
          onClose={closeDocument}
          onSaveAttachment={handleSaveAttachment}
        />
      )}
    </DocumentViewerContext.Provider>
  );
};

export const useDocumentViewer = () => useContext(DocumentViewerContext);
