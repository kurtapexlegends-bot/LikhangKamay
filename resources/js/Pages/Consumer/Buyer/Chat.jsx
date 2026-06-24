import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatDateLabel } from '@/lib/chatTime';
import useEchoConnection from '@/hooks/useEchoConnection';

// Extracted Modular Subcomponents
import BuyerChatContacts from '@/Components/Consumer/Buyer/Chat/BuyerChatContacts';
import BuyerMessageWindow from '@/Components/Consumer/Buyer/Chat/BuyerMessageWindow';
import BuyerMessageInput from '@/Components/Consumer/Buyer/Chat/BuyerMessageInput';
import BuyerSellerInfoPanel from '@/Components/Consumer/Buyer/Chat/BuyerSellerInfoPanel';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function BuyerChat({ auth, conversations, activeMessages, currentChatUser, currentOrderContext = null }) {
    const isEchoConnected = useEchoConnection();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [timeNow, setTimeNow] = useState(Date.now());
    const [activeMedia, setActiveMedia] = useState(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
    const [pendingMessages, setPendingMessages] = useState([]);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    const form = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null
    });

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

    useEffect(() => {
        setIsCounterpartTyping(!!currentChatUser?.is_typing);
    }, [currentChatUser?.id, currentChatUser?.is_typing]);

    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected || !currentChatUser || form.processing) return undefined;

        const interval = setInterval(() => {
            if (document.hidden) return;
            router.reload({
                only: ['activeMessages', 'conversations', 'currentOrderContext'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isEchoConnected, currentChatUser?.id, form.processing]);

    // Real-time WebSockets via Echo
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const channel = window.Echo.private(`chat.${auth.user.id}`);

        channel.listen('.message.sent', (e) => {
            if (e.message.sender_id === auth.user.id) return;
            if (currentChatUser && e.message.sender_id === currentChatUser.id) {
                router.reload({ only: ['activeMessages', 'conversations', 'currentOrderContext'] });
            } else {
                router.reload({ only: ['conversations'] });
            }
        });

        channel.listen('.message.seen', (e) => {
            if (currentChatUser && e.senderId === currentChatUser.id) {
                router.reload({ only: ['activeMessages'] });
            }
        });

        channel.listen('.user.typing', (e) => {
            if (currentChatUser && e.senderId === currentChatUser.id) {
                setIsCounterpartTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsCounterpartTyping(false);
                }, 4000);
            }
        });

        return () => {
            channel.stopListening('.message.sent');
            channel.stopListening('.message.seen');
            channel.stopListening('.user.typing');
        };
    }, [auth.user.id, currentChatUser?.id]);

    // Mark messages as seen/read
    const markAsRead = (senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    };

    useEffect(() => {
        setPendingMessages([]);
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

    const displayedMessages = useMemo(() => {
        return [...activeMessages, ...pendingMessages];
    }, [activeMessages, pendingMessages]);

    // Memoized messages grouped by date label
    const groupedMessages = useMemo(() => displayedMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [displayedMessages, timeNow]);

    // Extract all image attachments for the media gallery viewer
    const galleryImages = useMemo(() => displayedMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') ? msg.attachment_path : `/storage/${msg.attachment_path}`,
            type: 'image',
            id: msg.id
        })), [displayedMessages]);

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
                            currentChatUser={{
                                ...currentChatUser,
                                is_typing: isCounterpartTyping
                            }}
                            activeMessages={displayedMessages}
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
                            <BuyerMessageInput 
                                currentChatUser={currentChatUser} 
                                form={form}
                                onSendStart={(tempMsg) => setPendingMessages(prev => [...prev, tempMsg])}
                                onSendFinished={(tempId, success) => {
                                    if (success) {
                                        setPendingMessages(prev => prev.filter(m => m.id !== tempId));
                                    } else {
                                        setPendingMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
                                    }
                                }}
                            />
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
                        activeMessages={activeMessages}
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
                activeMessages={activeMessages}
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
