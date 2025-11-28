import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, MessageSquare, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { chatAPI } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Loading } from '../../components/ui/Loading';
import { getFullName, cn, formatDate } from '../../lib/utils';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useSocket } from '../../hooks/useSocket';
import type { Chat, Message, User } from '../../types';

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const { socket, isConnected } = useSocket();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showChatList, setShowChatList] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchChats = async () => {
    try {
      const response = await chatAPI.getChats();
      setChats(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const response = await chatAPI.getMessages(chatId);
      // API returns { data: { items: [], pagination: {} } }
      setMessages(response.data.data?.items || response.data.data?.messages || response.data.data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const startChatWithUser = async (userId: string) => {
    try {
      const response = await chatAPI.accessChat(userId);
      const chat = response.data.data;
      if (chat) {
        setSelectedChat(chat);
        fetchMessages(chat._id);
        setChats(prev => {
          if (!prev.find(c => c._id === chat._id)) {
            return [chat, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && user?._id !== userId) {
      startChatWithUser(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = ({ data }: { data: Message }) => {
      const message = data;
      if (selectedChat && message.chatId === selectedChat._id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
      setChats(prev => prev.map(chat => 
        chat._id === message.chatId 
          ? { ...chat, latestMessage: message }
          : chat
      ));
    };

    const handleTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (selectedChat?._id === chatId && userId !== user?._id) {
        setTypingUsers(prev => [...new Set([...prev, userId])]);
      }
    };

    const handleStopTyping = ({ chatId, userId }: { chatId: string; userId: string }) => {
      if (selectedChat?._id === chatId) {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    };

    socket.on('message received', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    return () => {
      socket.off('message received', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket, isConnected, selectedChat, user]);

  useEffect(() => {
    if (socket && selectedChat) {
      socket.emit('join chat', selectedChat._id);
      return () => {
        socket.emit('leave chat', selectedChat._id);
      };
    }
  }, [socket, selectedChat]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    fetchMessages(chat._id);
    setTypingUsers([]);
    setShowChatList(false); // Hide chat list on mobile when selecting a chat
  };

  const handleBackToList = () => {
    setShowChatList(true);
    setSelectedChat(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    try {
      setSending(true);
      const response = await chatAPI.sendMessage(selectedChat._id, newMessage.trim());
      const message = response.data.data;
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
      
      if (socket) {
        socket.emit('stop typing', selectedChat._id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedChat) return;

    socket.emit('typing', selectedChat._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing', selectedChat._id);
    }, 2000);
  };

  const getChatParticipant = (chat: Chat): User | null => {
    const participant = chat.participants.find(p => {
      const participantUser = p.user as User;
      return participantUser._id !== user?._id;
    });
    return participant?.user as User || null;
  };

  const filteredChats = chats.filter(chat => {
    const participant = getChatParticipant(chat);
    if (!participant) return false;
    const name = getFullName(participant.profile?.firstName, participant.profile?.lastName);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)] bg-card rounded-lg border overflow-hidden">
      {/* Chat List - Hidden on mobile when chat is selected */}
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col",
        !showChatList && "hidden md:flex"
      )}>
        <div className="p-3 md:p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <Loading size="sm" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const participant = getChatParticipant(chat);
              if (!participant) return null;
              
              return (
                <button
                  key={chat._id}
                  onClick={() => handleSelectChat(chat)}
                  className={cn(
                    'w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors text-left',
                    selectedChat?._id === chat._id && 'bg-accent'
                  )}
                >
                  <Avatar
                    src={participant.avatar}
                    firstName={participant.profile?.firstName}
                    lastName={participant.profile?.lastName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {getFullName(participant.profile?.firstName, participant.profile?.lastName)}
                      </p>
                      {chat.latestMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(chat.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {chat.latestMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {(chat.latestMessage.sender as User)?._id === user?._id ? 'You: ' : ''}
                        {chat.latestMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Content - Full width on mobile */}
      <div className={cn(
        "flex-1 flex flex-col",
        showChatList && "hidden md:flex"
      )}>
        {selectedChat ? (
          <>
            <div className="p-3 md:p-4 border-b flex items-center justify-between gap-3">
              {/* Back button for mobile */}
              <button
                onClick={handleBackToList}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {(() => {
                const participant = getChatParticipant(selectedChat);
                return participant ? (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      src={participant.avatar}
                      firstName={participant.profile?.firstName}
                      lastName={participant.profile?.lastName}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {getFullName(participant.profile?.firstName, participant.profile?.lastName)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {participant.role}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loading size="lg" text="Loading messages..." />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const senderUser = message.sender as User;
                    const isOwn = senderUser?._id === user?._id;
                    const prevSender = messages[index - 1]?.sender as User;
                    const showAvatar = index === 0 || prevSender?._id !== senderUser?._id;
                    
                    return (
                      <div
                        key={message._id}
                        className={cn(
                          'flex items-end gap-2',
                          isOwn && 'flex-row-reverse'
                        )}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar
                            src={senderUser?.avatar}
                            firstName={senderUser?.profile?.firstName}
                            lastName={senderUser?.profile?.lastName}
                            size="sm"
                          />
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div
                          className={cn(
                            'max-w-[70%] px-4 py-2 rounded-2xl',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] opacity-70">
                              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isOwn && (
                              message.readBy?.length > 1 ? (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                              ) : (
                                <Check className="h-3 w-3 opacity-70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-2 bg-muted rounded-2xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-3 md:p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || sending} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-20 w-20 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground max-w-sm">
              Choose a conversation from the list or start a new one to begin messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
