export function createOptimisticMessage(tempId, messageText, attachmentPreview) {
    return {
        id: tempId,
        text: messageText,
        attachment_path: attachmentPreview ? attachmentPreview.url : null,
        attachment_type: attachmentPreview ? attachmentPreview.type : null,
        sender: 'me',
        created_at: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_read: false,
        status: 'sending'
    };
}
