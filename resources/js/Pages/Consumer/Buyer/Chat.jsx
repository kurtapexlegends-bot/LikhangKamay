import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Head, router } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatDateLabel } from '@/lib/chatTime';

// Extracted Modular Subcomponents
import BuyerChatContacts from '@/Components/Consumer/Buyer/Chat/BuyerChatContacts';
import BuyerMessageWindow from '@/Components/Consumer/Buyer/Chat/BuyerMessageWindow';
import BuyerMessageInput from '@/Components/Consumer/Buyer/Chat/BuyerMessageInput';
import BuyerSellerInfoPanel from '@/Components/Consumer/Buyer/Chat/BuyerSellerInfoPanel';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function BuyerChat({ auth, conversations, activeMessages, currentChatUser, currentOrderContext = null }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [timeNow, setTimeNow] = useState(Date.now());
    const [activeMedia, setActiveMedia] = useState(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

    const currentChatUserShopHref = currentChatUser?.shop_slug
        ? route('shop.seller', currentChatUser.shop_slug)
        : null;

    const currentChatUserAddress = formatStructuredAddress({
        street_address: currentChatUser?.street_address,
        barangay: currentChatUser?.barangay,
        city: currentChatUser?.city,
        region: currentChatUser?.region,
        postal_code: currentChatUser?.zip_code,
    });

    // Detect screen size for responsive info drawer/sidebar
    useEffect(() => {
        const checkSize = () => setIsDesktop(window.innerWidth >= 1280);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    // Regular interval to update relative times
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeNow(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Polling active messages and conversations state
    useEffect(() => {
        if (!currentChatUser) return undefined;
        const interval = setInterval(() => {
            router.reload({ only: ['activeMessages', 'conversations', 'currentOrderContext'] });
        }, 3000);
        return () => clearInterval(interval);
    }, [currentChatUser]);

    // Mark messages as seen/read
    const markAsRead = (senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    };

    useEffect(() => {
        if (currentChatUser) {
            setShowMobileList(false);
            if (document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        }
    }, [currentChatUser, activeMessages.length]);

    // Focus state listeners and body helper classes for mobile dock adjustments
    useEffect(() => {
        const handleFocus = () => {
            if (currentChatUser && document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        };
        
        if (currentChatUser && !showMobileList) {
            document.body.classList.add('has-sticky-action-bar');
        } else {
            document.body.classList.remove('has-sticky-action-bar');
        }

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.body.classList.remove('has-sticky-action-bar');
        };
    }, [currentChatUser, showMobileList]);

    // Memoized messages grouped by date label
    const groupedMessages = useMemo(() => activeMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [activeMessages, timeNow]);

    // Extract all image attachments for the media gallery viewer
    const galleryImages = useMemo(() => activeMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: `/storage/${msg.attachment_path}`,
            type: 'image',
            id: msg.id
        })), [activeMessages]);

    return (
        <div className="h-screen overflow-hidden bg-[#FDFBF9] font-sans text-gray-800 flex flex-col" style={{ scrollbarGutter: 'stable' }}>
            <ImpersonationBanner />
            <Head title="My Messages" />

            {/* Navbar (Hidden on mobile when in conversation) */}
            <div className={`${!showMobileList ? 'hidden sm:block' : 'block'}`}>
                <BuyerNavbar />
            </div>

            {/* Chat Workspace Container */}
            <main className={`flex-1 min-h-0 overflow-hidden max-w-7xl w-full mx-auto sm:px-6 lg:px-8 sm:py-6 ${!showMobileList ? 'p-0 sm:px-4' : 'p-4'}`}>
                <div className="bg-white border border-gray-100 shadow-lg overflow-hidden flex flex-col sm:flex-row w-full h-full sm:rounded-2xl">
                    
                    {/* Contacts sidebar pane */}
                    <BuyerChatContacts
                        conversations={conversations}
                        currentChatUser={currentChatUser}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        timeNow={timeNow}
                        showMobileList={showMobileList}
                    />

                    {/* Messages convo window pane */}
                    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-white ${!showMobileList ? 'flex' : 'hidden sm:flex'}`}>
                        <BuyerMessageWindow
                            currentChatUser={currentChatUser}
                            activeMessages={activeMessages}
                            currentOrderContext={currentOrderContext}
                            groupedMessages={groupedMessages}
                            galleryImages={galleryImages}
                            setActiveMedia={setActiveMedia}
                            setShowMobileList={setShowMobileList}
                            showInfoPanel={showInfoPanel}
                            setShowInfoPanel={setShowInfoPanel}
                            timeNow={timeNow}
                            messagesEndRef={messagesEndRef}
                        />

                        {currentChatUser && (
                            <BuyerMessageInput currentChatUser={currentChatUser} />
                        )}
                    </div>

                    {/* Seller info desktop pane (XL viewports) */}
                    <BuyerSellerInfoPanel
                        currentChatUser={currentChatUser}
                        currentChatUserAddress={currentChatUserAddress}
                        currentChatUserShopHref={currentChatUserShopHref}
                        showInfoPanel={showInfoPanel}
                        setShowInfoPanel={setShowInfoPanel}
                        isDesktop={true}
                    />
                </div>
            </main>

            {/* Seller info slide drawer overlay (Mobile/Tablet viewports) */}
            <BuyerSellerInfoPanel
                currentChatUser={currentChatUser}
                currentChatUserAddress={currentChatUserAddress}
                currentChatUserShopHref={currentChatUserShopHref}
                showInfoPanel={showInfoPanel && !isDesktop}
                setShowInfoPanel={setShowInfoPanel}
                isDesktop={false}
            />

            {/* Media Viewer Lightbox */}
            <Suspense fallback={null}>
                <MediaViewer 
                    show={!!activeMedia} 
                    mediaList={galleryImages}
                    initialIndex={activeMedia?.index || 0}
                    onClose={() => setActiveMedia(null)} 
                />
            </Suspense>
        </div>
    );
}
