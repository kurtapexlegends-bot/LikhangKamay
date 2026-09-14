import { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function useChatTemplates() {
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState(null);

    const { 
        data: templateData, 
        setData: setTemplateData, 
        post: postTemplate, 
        put: putTemplate, 
        delete: deleteTemplate, 
        processing: templateProcessing, 
        reset: resetTemplate, 
        errors: templateErrors 
    } = useForm({
        id: null,
        title: '',
        shortcut: '',
        content: ''
    });

    const submitTemplate = (e) => {
        e.preventDefault();
        if (editingTemplateId) {
            putTemplate(route('chat.templates.update', editingTemplateId), {
                onSuccess: () => {
                    setEditingTemplateId(null);
                    resetTemplate();
                }
            });
        } else {
            postTemplate(route('chat.templates.store'), {
                onSuccess: () => {
                    resetTemplate();
                }
            });
        }
    };

    const handleEditTemplate = (template) => {
        setEditingTemplateId(template.id);
        setTemplateData({
            id: template.id,
            title: template.title,
            shortcut: template.shortcut || '',
            content: template.content
        });
    };

    const handleDeleteTemplate = (id) => {
        setDeletingTemplateId(id);
    };

    const confirmDeleteTemplate = () => {
        const id = deletingTemplateId;
        setDeletingTemplateId(null);
        deleteTemplate(route('chat.templates.destroy', id));
    };

    return {
        showTemplateManager,
        setShowTemplateManager,
        showTemplateSelector,
        setShowTemplateSelector,
        editingTemplateId,
        setEditingTemplateId,
        deletingTemplateId,
        setDeletingTemplateId,
        templateData,
        setTemplateData,
        templateProcessing,
        templateErrors,
        resetTemplate,
        submitTemplate,
        handleEditTemplate,
        handleDeleteTemplate,
        confirmDeleteTemplate,
    };
}
