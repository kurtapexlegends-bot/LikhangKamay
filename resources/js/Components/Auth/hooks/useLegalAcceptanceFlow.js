import { useState } from 'react';

export default function useLegalAcceptanceFlow(onAllAccepted) {
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'terms' });
    const [, setIsGuidingTermsAcceptance] = useState(false);
    const [acceptedLegalDocuments, setAcceptedLegalDocuments] = useState({
        terms: false,
        privacy: false,
    });

    const openLegalModal = (type) => {
        setLegalModal({ isOpen: true, type });
    };

    const closeLegalModal = () => {
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
    };

    const openNextRequiredLegalModal = (documents = acceptedLegalDocuments) => {
        if (!documents.terms) {
            setLegalModal({ isOpen: true, type: 'terms' });
            return;
        }

        if (!documents.privacy) {
            setLegalModal({ isOpen: true, type: 'privacy' });
            return;
        }

        setIsGuidingTermsAcceptance(false);
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
        onAllAccepted?.(true);
    };

    const handleLegalModalClose = (payload = {}) => {
        if (!payload.accepted) {
            setIsGuidingTermsAcceptance(false);
        }
        closeLegalModal();
    };

    const handleLegalAccept = () => {
        const currentType = legalModal.type;
        const updatedDocuments = {
            ...acceptedLegalDocuments,
            [currentType]: true,
        };

        setAcceptedLegalDocuments(updatedDocuments);

        if (currentType === 'terms' && !updatedDocuments.privacy) {
            setLegalModal({ isOpen: true, type: 'privacy' });
            return false;
        }

        if (currentType === 'privacy' && !updatedDocuments.terms) {
            setLegalModal({ isOpen: true, type: 'terms' });
            return false;
        }

        setIsGuidingTermsAcceptance(false);
        setLegalModal((previous) => ({ ...previous, isOpen: false }));
        onAllAccepted?.(true);
        return true;
    };

    const handleLegalBack = () => {
        const previousType = legalModal.type === 'terms' ? 'privacy' : 'terms';
        setLegalModal({ isOpen: true, type: previousType });
    };

    const canEnableTermsCheckbox = acceptedLegalDocuments.terms && acceptedLegalDocuments.privacy;

    const handleTermsCheckboxChange = (e) => {
        if (!e.target.checked) {
            onAllAccepted?.(false);
            return;
        }

        if (canEnableTermsCheckbox) {
            onAllAccepted?.(true);
            return;
        }

        onAllAccepted?.(false);
        setIsGuidingTermsAcceptance(true);
        openNextRequiredLegalModal();
    };

    const isTermsAgreed = Boolean(acceptedLegalDocuments.terms);
    const isPrivacyAgreed = Boolean(acceptedLegalDocuments.privacy);
    const isBothAgreed = isTermsAgreed && isPrivacyAgreed;
    const currentDocAccepted = Boolean(acceptedLegalDocuments[legalModal.type]);
    const counterpartAccepted = legalModal.type === 'terms' ? isPrivacyAgreed : isTermsAgreed;

    let modalStep = null;
    let modalTotalSteps = null;
    let modalHasNextStep = false;

    if (!isBothAgreed) {
        modalTotalSteps = 2;
        if (!counterpartAccepted && !currentDocAccepted) {
            modalStep = 1;
            modalHasNextStep = true;
        } else if (counterpartAccepted && !currentDocAccepted) {
            modalStep = 2;
            modalHasNextStep = false;
        } else {
            modalStep = 1;
            modalHasNextStep = true;
        }
    }

    return {
        legalModal,
        openLegalModal,
        handleLegalModalClose,
        handleLegalAccept,
        handleLegalBack,
        handleTermsCheckboxChange,
        modalStep,
        modalTotalSteps,
        modalHasNextStep,
    };
}
