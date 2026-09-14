import React, { lazy, Suspense } from 'react';
import QuickTemplateSelector from '@/Components/Seller/Chat/QuickTemplateSelector';
import ChatAutomationModal from '@/Components/Seller/Chat/ChatAutomationModal';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function ChatModals({
    activeMedia,
    setActiveMedia,
    galleryImages,
    templateManager,
    chatTemplates,
    showAutomationModal,
    setShowAutomationModal,
    autoReplySettings,
    canEditMessages,
}) {
    return (
        <>
            <Suspense fallback={null}>
                <MediaViewer 
                    show={!!activeMedia} 
                    mediaList={galleryImages}
                    initialIndex={activeMedia?.index || 0}
                    onClose={() => setActiveMedia(null)} 
                />
            </Suspense>

            <QuickTemplateSelector
                showTemplateManager={templateManager.showTemplateManager}
                setShowTemplateManager={templateManager.setShowTemplateManager}
                chatTemplates={chatTemplates}
                editingTemplateId={templateManager.editingTemplateId}
                setEditingTemplateId={templateManager.setEditingTemplateId}
                templateData={templateManager.templateData}
                setTemplateData={templateManager.setTemplateData}
                templateProcessing={templateManager.templateProcessing}
                submitTemplate={templateManager.submitTemplate}
                resetTemplate={templateManager.resetTemplate}
                templateErrors={templateManager.templateErrors}
                handleEditTemplate={templateManager.handleEditTemplate}
                handleDeleteTemplate={templateManager.handleDeleteTemplate}
                deletingTemplateId={templateManager.deletingTemplateId}
                setDeletingTemplateId={templateManager.setDeletingTemplateId}
                confirmDeleteTemplate={templateManager.confirmDeleteTemplate}
            />

            <ChatAutomationModal
                isOpen={showAutomationModal}
                onClose={() => setShowAutomationModal(false)}
                autoReplySettings={autoReplySettings}
                chatTemplates={chatTemplates}
                canEdit={canEditMessages}
            />
        </>
    );
}
