import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Folder, 
  ThumbsUp, Eye, ChevronRight, X, Pencil, Trash
} from 'lucide-react';
import { solutionsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Solutions() {
  const { addToast } = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingArticle, setViewingArticle] = useState(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  const fetchSolutions = () => {
    setLoading(true);
    solutionsApi.getAll()
      .then(data => {
        setArticles(data.results || data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[Solutions] Error fetching solutions:", err);
        setArticles([]);
        setLoading(false);
        addToast('Failed to load solutions', 'error');
      });
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const handleCreateArticle = () => {
    solutionsApi.create({ title, category, content, tags })
    .then(data => {
      setIsModalOpen(false);
      setTitle('');
      setCategory('');
      setContent('');
      setTags('');
      fetchSolutions();
      addToast('Article created successfully', 'success');
    })
    .catch(err => {
      console.error("[Solutions] Error in handleCreateArticle:", err);
      addToast('Failed to create article', 'error');
    });
  };

  const handleEditClick = (article) => {
    setSelectedArticle(article);
    setTitle(article.title || '');
    setCategory(article.category || '');
    setContent(article.content || '');
    setTags(article.tags || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateArticle = () => {
    if (!selectedArticle) return;
    solutionsApi.update(selectedArticle.id, { title, category, content, tags })
    .then(data => {
      setIsEditModalOpen(false);
      setSelectedArticle(null);
      setTitle('');
      setCategory('');
      setContent('');
      setTags('');
      fetchSolutions();
      addToast('Article updated successfully', 'success');
    })
    .catch(err => {
      console.error("[Solutions] Error in handleUpdateArticle:", err);
      addToast('Failed to update article', 'error');
    });
  };

  const handleDeleteArticle = (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Article",
      description: "Are you sure you want to delete this article? This action cannot be undone.",
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        solutionsApi.delete(id)
        .then(() => {
          fetchSolutions();
          addToast('Article deleted successfully', 'success');
        })
        .catch(err => {
          console.error("[Solutions] Error in handleDeleteArticle:", err);
          addToast('Failed to delete article', 'error');
        });
      }
    });
  };

  // Derive categories from articles
  const categories = articles.reduce((acc, art) => {
    const cat = art.category || 'General';
    const existing = acc.find(c => c.name === cat);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: cat, count: 1 });
    }
    return acc;
  }, []);

  const filteredArticles = articles.filter(art => {
    const matchesCategory = selectedCategory === 'All' || (art.category || 'General') === selectedCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (art.content && art.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (art.tags && art.tags.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      {/* Header Section with Gradient and Glassmorphism */}
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 shadow-sm overflow-hidden sticky top-0 z-30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 uppercase tracking-tighter">Solutions Hub</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Access verified troubleshooting guides and documentation.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none w-full sm:w-64 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Article
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column - Categories (Glassmorphism Sidebar) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 shadow-sm sticky top-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Categories</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedCategory('All')}
                className={`w-full flex items-center justify-between p-3 text-sm font-bold rounded-xl transition-colors ${
                  selectedCategory === 'All' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center">
                  <Folder className={`w-4 h-4 mr-2 ${selectedCategory === 'All' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>All Articles</span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  selectedCategory === 'All' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                }`}>{articles.length}</span>
              </button>
              
              {categories.length === 0 ? (
                <div className="text-xs text-slate-400 p-2">No categories yet</div>
              ) : (
                categories.map((cat) => (
                  <button 
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full flex items-center justify-between p-3 text-sm font-bold rounded-xl transition-all hover:translate-x-1 ${
                      selectedCategory === cat.name 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Folder className={`w-4 h-4 mr-2 ${selectedCategory === cat.name ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{cat.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedCategory === cat.name ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>{cat.count}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Articles (Dynamic Cards) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Recent Articles</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-slate-500 font-bold">Loading articles...</span>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Folder className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-sm font-bold">No articles found</div>
                <p className="text-xs mt-1">No articles in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredArticles.map((art) => (
                  <div 
                    key={art.id} 
                    onClick={() => { setViewingArticle(art); setIsViewModalOpen(true); }}
                    className="p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:border-blue-200 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                    
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{art.title}</h4>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase text-[10px] tracking-wider">{art.category || 'General'}</span>
                          
                          <div className="flex items-center gap-1 font-medium">
                            <Eye className="w-3.5 h-3.5" />
                            {art.views_count || 0} views
                          </div>
                          <div className="flex items-center gap-1 font-medium">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {art.helpful_count || 0} helpful
                          </div>
                          <span className="font-medium">Updated {new Date(art.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Tags as Pills */}
                        {art.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {art.tags.split(',').map((tag, i) => (
                              <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(art); }}
                          className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteArticle(art.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Article Modal (Redesigned) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Create New Article</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Troubleshooting"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Content</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article content here..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Tags</label>
                <input 
                  type="text" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. login, password (comma separated)"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateArticle}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Create Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Article Modal (Redesigned) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Edit Article</h2>
              <button onClick={() => { setIsEditModalOpen(false); setSelectedArticle(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Troubleshooting"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Content</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article content here..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Tags</label>
                <input 
                  type="text" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. login, password (comma separated)"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button 
                  onClick={() => { setIsEditModalOpen(false); setSelectedArticle(null); }}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateArticle}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Update Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Article Modal (Redesigned for Premium Look) */}
      {isViewModalOpen && viewingArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            {/* Header with Dark Slate Background (Matching Sidebar) */}
            <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
              
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full text-white backdrop-blur-sm">{viewingArticle.category || 'General'}</span>
                  <h2 className="text-xl font-black mt-2 tracking-tight">{viewingArticle.title}</h2>
                </div>
                <button 
                  onClick={() => { setIsViewModalOpen(false); setViewingArticle(null); }} 
                  className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Metadata in Header */}
              <div className="flex items-center gap-4 text-xs text-white/70 mt-4 relative z-10 font-medium">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{viewingArticle.views_count || 0} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{viewingArticle.helpful_count || 0} helpful</span>
                </div>
                <span>Updated {new Date(viewingArticle.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Content Area with Scroller */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[40vh] bg-slate-50/50">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {viewingArticle.content || 'No content available for this article.'}
                </div>
              </div>
              
              {/* Tags as Cards */}
              {viewingArticle.tags && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Associated Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingArticle.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
              <button 
                onClick={() => { setIsViewModalOpen(false); setViewingArticle(null); }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Delete"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
