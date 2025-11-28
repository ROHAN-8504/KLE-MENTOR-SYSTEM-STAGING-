import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, FileText, Pin, Calendar, User as UserIcon } from 'lucide-react';
import { postAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { formatDateTime, getFullName } from '../../lib/utils';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { Post } from '../../types';

export const PostsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    visibility: 'group' as 'all' | 'group' | 'personal',
    isPinned: false,
  });

  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const canCreate = isMentor || isAdmin || isStudent; // All authenticated users can create posts

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const groupId = searchParams.get('groupId');
      const response = await postAPI.getPosts({ groupId: groupId || undefined });
      // API returns { data: { items: [], pagination: {} } }
      setPosts(response.data.data?.items || response.data.data?.posts || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    try {
      setCreating(true);
      await postAPI.createPost({
        title: newPost.title,
        content: newPost.content,
        visibility: newPost.visibility,
        isPinned: newPost.isPinned,
      });
      setShowCreateModal(false);
      setNewPost({ title: '', content: '', visibility: 'group', isPinned: false });
      fetchPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.content.toLowerCase().includes(search.toLowerCase())
  );

  // Separate pinned posts
  const pinnedPosts = filteredPosts.filter(post => post.isPinned);
  const regularPosts = filteredPosts.filter(post => !post.isPinned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-muted-foreground mt-1">
            Announcements and updates from mentors
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading posts..." />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Posts Yet</h2>
            <p className="text-muted-foreground text-center">
              {canCreate
                ? 'Create your first post to share with your mentees.'
                : 'No announcements have been posted yet.'}
            </p>
            {canCreate && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned Posts */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Pin className="h-4 w-4" />
                Pinned Posts
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pinnedPosts.map(post => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Posts */}
          <div className="space-y-4">
            {pinnedPosts.length > 0 && regularPosts.length > 0 && (
              <h2 className="text-lg font-semibold">All Posts</h2>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {regularPosts.map(post => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Post"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <Input
              placeholder="Enter post title"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Content</label>
            <Textarea
              placeholder="Write your post content..."
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={5}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Visibility</label>
            <Select
              value={newPost.visibility}
              onChange={(e) => setNewPost({ ...newPost, visibility: e.target.value as 'all' | 'group' | 'personal' })}
              options={[
                { value: 'group', label: 'My Group Only' },
                { value: 'all', label: 'All Students' },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newPost.isPinned}
              onChange={(e) => setNewPost({ ...newPost, isPinned: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">Pin this post</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Post
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const author = post.author as { profile: { firstName: string; lastName: string }; avatar?: string } | undefined;
  
  return (
    <Link to={`posts/${post._id}`}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1">{post.title}</CardTitle>
            {post.isPinned && (
              <Badge variant="secondary" className="flex-shrink-0">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {post.content}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {author ? (
                <>
                  <Avatar
                    src={author.avatar}
                    firstName={author.profile.firstName}
                    lastName={author.profile.lastName}
                    size="sm"
                  />
                  <span className="text-sm text-muted-foreground">
                    {getFullName(author.profile.firstName, author.profile.lastName)}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Unknown</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDateTime(post.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PostsPage;
