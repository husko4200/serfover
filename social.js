/**
 * SERFOVER - Lógica de Red Social (Muro y Chat)
 * Maneja las publicaciones del muro, lista de usuarios y mensajes directos.
 */

class SocialManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('serfover_user'));
        this.currentChatUser = null;
        this.checkInterval = null;
    }

    init() {
        if (!this.currentUser) return;
        
        // Cargar muro
        this.loadFeed();
        
        // Cargar lista de usuarios
        this.loadUsersList();
        
        // Listener para crear post
        const formPost = document.getElementById('formCreatePost');
        if (formPost) {
            formPost.addEventListener('submit', (e) => this.handleCreatePost(e));
        }

        // Listener para enviar mensaje en chat
        const formChat = document.getElementById('formChat');
        if (formChat) {
            formChat.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

        // Listener para input de imagen en el post
        const imageInput = document.getElementById('postImageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handlePostImagePreview(e));
        }

        // Simular polling para tiempo real cada 10 segundos
        this.checkInterval = setInterval(() => {
            if (document.getElementById('tab-muro') && document.getElementById('tab-muro').classList.contains('active')) {
                this.loadFeed();
            }
            if (this.currentChatUser && document.getElementById('chatWindow').classList.contains('active')) {
                this.loadChat(this.currentChatUser);
            }
        }, 10000);
    }

    // --- DATOS SOCIALES (Híbrido: Local + Google Sheets) ---
    async fetchSocialData(type) {
        // Intentar cargar desde Google Sheets
        try {
            const data = await API.getData();
            const cloudData = data['social_' + type] || [];
            // Si hay datos en la nube, guardarlos localmente como caché
            if (cloudData.length > 0) {
                localStorage.setItem(`serfover_social_${type}`, JSON.stringify(cloudData));
                return cloudData;
            }
        } catch(e) {
            console.warn('No se pudo cargar desde la nube, usando datos locales:', e);
        }
        // Fallback a localStorage
        return JSON.parse(localStorage.getItem(`serfover_social_${type}`)) || [];
    }

    async saveSocialData(type, item) {
        // 1. Guardar localmente de inmediato para que se vea al instante
        const localData = JSON.parse(localStorage.getItem(`serfover_social_${type}`)) || [];
        localData.push(item);
        localStorage.setItem(`serfover_social_${type}`, JSON.stringify(localData));

        // 2. Enviar a Google Sheets en segundo plano (sin esperar respuesta)
        try {
            API.sendData({ type: 'social_' + type, data: item });
        } catch(e) {
            console.warn('Error enviando a la nube:', e);
        }
        return true;
    }

    async deleteSocialData(type, itemId) {
        // 1. Borrar localmente de inmediato
        let localData = JSON.parse(localStorage.getItem(`serfover_social_${type}`)) || [];
        localData = localData.filter(item => item.id !== itemId);
        localStorage.setItem(`serfover_social_${type}`, JSON.stringify(localData));

        // 2. Borrar en Google Sheets en segundo plano
        try {
            API.deleteData('social_' + type, itemId);
        } catch(e) {
            console.warn('Error eliminando de la nube:', e);
        }
    }

    async updateSocialData(type, data) {
        localStorage.setItem(`serfover_social_${type}`, JSON.stringify(data));
    }
    // --------------------

    // --- MURO ---
    async loadFeed() {
        const feedContainer = document.getElementById('feedContainer');
        if (!feedContainer) return;

        const posts = await this.fetchSocialData('posts');
        const comments = await this.fetchSocialData('comments');
        
        // Ordenar del más nuevo al más viejo
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (posts.length === 0) {
            feedContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No hay publicaciones aún. ¡Sé el primero en compartir algo!</p>';
            return;
        }

        feedContainer.innerHTML = '';
        posts.forEach(post => {
            const hasLiked = post.likes && post.likes.includes(this.currentUser.username);
            const likeCount = post.likes ? post.likes.length : 0;
            const likeColor = hasLiked ? 'var(--accent-danger)' : 'var(--text-secondary)';
            const likeFill = hasLiked ? 'var(--accent-danger)' : 'none';

            let imageHtml = '';
            if (post.image) {
                imageHtml = `<img src="${post.image}" alt="Imagen adjunta" class="feed-post-image">`;
            }

            let avatarHtml = post.authorAvatar 
                ? `<img src="${post.authorAvatar}" alt="Avatar">`
                : post.authorName.charAt(0).toUpperCase();
                
            let deleteBtnHtml = '';
            if (post.authorUsername === this.currentUser.username || this.currentUser.role === 'owner') {
                deleteBtnHtml = `<button class="action-btn" onclick="window.Social.deletePost('${post.id}')" style="color: var(--text-muted); padding: 0.2rem;" title="Eliminar Publicación">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                 </button>`;
            }
            
            // Comentarios del post
            const postComments = comments.filter(c => c.postId === post.id);
            postComments.sort((a, b) => new Date(a.date) - new Date(b.date)); // más viejos primero
            
            let commentsHtml = '';
            postComments.forEach(c => {
                let cAvatar = c.authorAvatar ? `<img src="${c.authorAvatar}" alt="Avatar">` : c.authorName.charAt(0).toUpperCase();
                commentsHtml += `
                    <div class="comment-item">
                        <div class="comment-avatar">${cAvatar}</div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <strong>${c.authorName}</strong> <span class="comment-time">${this.formatDate(c.date)}</span>
                            </div>
                            <div class="comment-text">${this.escapeHtml(c.content)}</div>
                        </div>
                    </div>
                `;
            });

            const postEl = document.createElement('div');
            postEl.className = 'feed-post';
            postEl.innerHTML = `
                <div class="feed-post-header">
                    <div style="display:flex; gap:0.75rem; align-items:center;">
                        <div class="feed-post-avatar">${avatarHtml}</div>
                        <div class="feed-post-info">
                            <h4>${post.authorName} <span class="role-badge ${post.authorRole}">${this.translateRole(post.authorRole)}</span></h4>
                            <span class="feed-post-time">${this.formatDate(post.date)}</span>
                        </div>
                    </div>
                    ${deleteBtnHtml}
                </div>
                <div class="feed-post-content">${this.escapeHtml(post.content)}</div>
                ${imageHtml}
                <div class="feed-post-actions">
                    <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="window.Social.toggleLike('${post.id}')" style="color: ${likeColor}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${likeFill}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        ${likeCount}
                    </button>
                    <button class="action-btn" onclick="document.getElementById('commentInput_${post.id}').focus()" style="color: var(--text-secondary)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        ${postComments.length}
                    </button>
                </div>
                <div class="comments-section">
                    ${commentsHtml}
                    <form class="comment-form" onsubmit="window.Social.addComment(event, '${post.id}')">
                        <input type="text" id="commentInput_${post.id}" placeholder="Escribe un comentario..." required>
                        <button type="submit">Enviar</button>
                    </form>
                </div>
            `;
            feedContainer.appendChild(postEl);
        });
    }

    async handleCreatePost(e) {
        e.preventDefault();
        const contentInput = document.getElementById('postContent');
        const content = contentInput.value.trim();
        const imagePreview = document.getElementById('postImagePreview');
        const base64Image = imagePreview.dataset.base64 || '';

        if (!content && !base64Image) return;

        const newPost = {
            id: 'post_' + Date.now(),
            authorUsername: this.currentUser.username,
            authorName: this.currentUser.name,
            authorRole: this.currentUser.role,
            authorAvatar: this.currentUser.avatar || '',
            content: content,
            image: base64Image,
            date: new Date().toISOString(),
            likes: []
        };

        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        btn.textContent = 'Publicando...';
        btn.disabled = true;

        await this.saveSocialData('posts', newPost);
        
        // Reset
        contentInput.value = '';
        imagePreview.style.display = 'none';
        imagePreview.dataset.base64 = '';
        document.getElementById('postImageInput').value = '';
        
        btn.textContent = oldText;
        btn.disabled = false;

        this.loadFeed();
    }

    async deletePost(postId) {
        if (!confirm('¿Seguro que quieres eliminar esta publicación?')) return;
        
        const btn = document.querySelector(`button[onclick="window.Social.deletePost('${postId}')"]`);
        if(btn) btn.innerHTML = '...';

        await this.deleteSocialData('posts', postId);
        this.loadFeed();
    }

    async addComment(e, postId) {
        e.preventDefault();
        const input = document.getElementById('commentInput_' + postId);
        const content = input.value.trim();
        if (!content) return;

        const newComment = {
            id: 'comment_' + Date.now(),
            postId: postId,
            authorUsername: this.currentUser.username,
            authorName: this.currentUser.name,
            authorRole: this.currentUser.role,
            authorAvatar: this.currentUser.avatar || '',
            content: content,
            date: new Date().toISOString()
        };

        const btn = e.target.querySelector('button');
        const oldText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;

        await this.saveSocialData('comments', newComment);
        
        input.value = '';
        btn.textContent = oldText;
        btn.disabled = false;
        
        this.loadFeed();
    }

    async toggleLike(postId) {
        const posts = await this.fetchSocialData('posts');
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        if (!post.likes) post.likes = [];

        const userLikeIndex = post.likes.indexOf(this.currentUser.username);
        if (userLikeIndex === -1) {
            post.likes.push(this.currentUser.username);
        } else {
            post.likes.splice(userLikeIndex, 1);
        }

        await this.updateSocialData('posts', posts);
        this.loadFeed();
    }

    handlePostImagePreview(e) {
        const input = e.target;
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const previewDiv = document.getElementById('postImagePreview');
                previewDiv.innerHTML = `<img src="${evt.target.result}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">
                                        <button type="button" onclick="window.Social.removePostImage()" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;">&times;</button>`;
                previewDiv.style.display = 'block';
                previewDiv.style.position = 'relative';
                previewDiv.dataset.base64 = evt.target.result;
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    removePostImage() {
        const previewDiv = document.getElementById('postImagePreview');
        previewDiv.style.display = 'none';
        previewDiv.innerHTML = '';
        previewDiv.dataset.base64 = '';
        document.getElementById('postImageInput').value = '';
    }

    // --- LISTA DE USUARIOS (EQUIPO) ---
    loadUsersList() {
        const usersListContainer = document.getElementById('usersListContainer');
        if (!usersListContainer) return;

        // Cargar de base de datos local (los perfiles están en serfover_users)
        const allUsers = JSON.parse(localStorage.getItem('serfover_users')) || [];
        
        usersListContainer.innerHTML = '';
        
        // No mostrarse a sí mismo en la lista derecha, o mostrarlo arriba? 
        // Mejor mostrar a todos excepto a mí para chatear.
        const otherUsers = allUsers.filter(u => u.username !== this.currentUser.username);

        if (otherUsers.length === 0) {
            usersListContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size:0.9rem;">No hay otros usuarios.</p>';
            return;
        }

        otherUsers.forEach(user => {
            let avatarHtml = user.avatar 
                ? `<img src="${user.avatar}" alt="Avatar">`
                : user.name.charAt(0).toUpperCase();
                
            let truckHtml = (user.role === 'driver' && user.truck) 
                ? `<span style="font-size:0.7rem; color:var(--brand-primary); margin-left:5px;">[${user.truck}]</span>` 
                : '';

            const userEl = document.createElement('div');
            userEl.className = 'user-contact-card';
            userEl.onclick = () => {
                this.openChat(user.username);
                // Cerrar sidebar en móviles al seleccionar un chat
                const sidebar = document.querySelector('.right-sidebar');
                if(sidebar && window.innerWidth <= 1200) {
                    sidebar.classList.remove('active');
                }
            };
            userEl.innerHTML = `
                <div class="user-contact-avatar">${avatarHtml}</div>
                <div class="user-contact-info">
                    <div class="user-contact-name">${user.name}</div>
                    <div class="user-contact-role">
                        <span class="role-badge ${user.role}">${this.translateRole(user.role)}</span>
                        ${truckHtml}
                    </div>
                </div>
            `;
            usersListContainer.appendChild(userEl);
        });
    }

    toggleTeamSidebar() {
        const sidebar = document.querySelector('.right-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    // --- CHAT DIRECTO ---
    openChat(targetUsername) {
        this.currentChatUser = targetUsername;
        
        const allUsers = JSON.parse(localStorage.getItem('serfover_users')) || [];
        const targetUser = allUsers.find(u => u.username === targetUsername);
        
        if (!targetUser) return;

        document.getElementById('chatTitle').textContent = targetUser.name;
        document.getElementById('chatWindow').classList.add('active');
        
        this.loadChat(targetUsername);
    }

    closeChat() {
        document.getElementById('chatWindow').classList.remove('active');
        this.currentChatUser = null;
    }

    async loadChat(targetUsername) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (!chatMessagesContainer) return;

        const allMessages = await this.fetchSocialData('messages');
        
        // Filtrar mensajes entre mi usuario y el target
        const chatHistory = allMessages.filter(m => 
            (m.from === this.currentUser.username && m.to === targetUsername) ||
            (m.from === targetUsername && m.to === this.currentUser.username)
        );

        chatHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        chatMessagesContainer.innerHTML = '';
        if (chatHistory.length === 0) {
            chatMessagesContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:1rem; font-size:0.8rem;">Envía un mensaje para saludar.</p>';
        } else {
            chatHistory.forEach(msg => {
                const isMine = msg.from === this.currentUser.username;
                const bubble = document.createElement('div');
                bubble.className = `chat-bubble ${isMine ? 'sent' : 'received'}`;
                bubble.innerHTML = `
                    ${this.escapeHtml(msg.content)}
                    <span class="chat-bubble-time">${this.formatTime(msg.date)}</span>
                `;
                chatMessagesContainer.appendChild(bubble);
            });
        }
        
        // Auto scroll to bottom
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    async handleSendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const content = input.value.trim();
        if (!content || !this.currentChatUser) return;

        const newMsg = {
            id: 'msg_' + Date.now(),
            from: this.currentUser.username,
            to: this.currentChatUser,
            content: content,
            date: new Date().toISOString()
        };

        await this.saveSocialData('messages', newMsg);
        
        input.value = '';
        this.loadChat(this.currentChatUser);
    }

    // --- UTILIDADES ---
    translateRole(role) {
        if (role === 'owner') return 'Admin';
        if (role === 'mechanic') return 'Mecánico';
        return 'Conductor';
    }

    formatDate(dateString) {
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    formatTime(dateString) {
        const options = { hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleTimeString('es-ES', options);
    }

    escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.Social = new SocialManager();
    window.Social.init();
});
