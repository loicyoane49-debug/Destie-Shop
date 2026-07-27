const SELLER_EMAIL = "primodestiem@gmail.com";
const VENDEUSE_PHONE = "242066431082"; // Numéro WhatsApp de la vendeuse

document.addEventListener('DOMContentLoaded', () => {
  // Activer la persistance locale pour Firebase (Essentiel pour la WebView Sketchware)
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => console.error("Erreur persistance :", error));
  }

  // Écouter l'état de connexion utilisateur
  setupAuthListener();

  // Charger la vue par défaut (Catalogue)
  switchView('catalog');
});

function setupAuthListener() {
  if (typeof firebase === 'undefined' || !firebase.auth) return;

  firebase.auth().onAuthStateChanged(async (user) => {
    const headerActions = document.getElementById('header-actions');

    if (user && user.email) {
      const userEmailClean = user.email.trim().toLowerCase();
      const sellerEmailClean = SELLER_EMAIL.trim().toLowerCase();
      const isSellerUser = (userEmailClean === sellerEmailClean);

      // Enregistrer les clients (non vendeuse) dans la collection users
      if (!isSellerUser) {
        try {
          await db.collection('users').doc(user.uid).set({
            email: user.email,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Erreur enregistrement user :", e);
        }
      }

      if (headerActions) {
        if (isSellerUser) {
          headerActions.innerHTML = `
            <button class="btn" style="background:#d97706; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; margin-right:0.3rem; font-weight:bold; cursor:pointer; font-size:0.8rem;" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> + Ajouter</button>
            <button class="btn btn-secondary" style="background:#4b5563; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.8rem;" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
          `;
        } else {
          headerActions.innerHTML = `
            <button class="btn btn-secondary" style="background:#4b5563; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.8rem;" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
          `;
        }
      }
    } else {
      if (headerActions) {
        headerActions.innerHTML = `
          <button class="btn btn-secondary" style="background:#374151; color:white; border:1px solid #4b5563; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.85rem;" onclick="openLoginModal(false)"><i class="fa-solid fa-user"></i> Connexion</button>
        `;
      }
    }
  });
}

window.switchView = function(viewName) {
  const container = document.getElementById('app-content');
  if (!container) return;

  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  if (viewName === 'catalog') {
    if (navItems[0]) navItems[0].classList.add('active');
    container.innerHTML = `<div class="product-grid" id="product-list"></div>`;
    loadCatalog();
  } else if (viewName === 'reservations') {
    if (navItems[1]) navItems[1].classList.add('active');
    loadReservationsView();
  } else if (viewName === 'purchases') {
    if (navItems[2]) navItems[2].classList.add('active');
    loadPurchasesView();
  } else if (viewName === 'profile') {
    if (navItems[3]) navItems[3].classList.add('active');
    loadProfileView();
  }
};

async function loadCatalog() {
  let container = document.getElementById('app-content');
  if (!container) return;

  let productList = document.getElementById('product-list');
  if (!productList) {
    container.innerHTML = `<div class="product-grid" id="product-list"></div>`;
    productList = document.getElementById('product-list');
  }

  const user = firebase.auth().currentUser;
  const isSeller = user && user.email && user.email.trim().toLowerCase() === SELLER_EMAIL.toLowerCase();

  try {
    const snapshot = await db.collection('products').get();
    productList.innerHTML = '';

    if (snapshot.empty) {
      productList.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
          <i class="fa-solid fa-store" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
          <h3 style="color: #4b5563;">Le catalogue est vide</h3>
          <p style="color: #9ca3af; font-size: 0.9rem; margin-top: 0.5rem;">Aucun article pour le moment.</p>
        </div>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const p = doc.data();
      const id = doc.id;
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300';

      const card = document.createElement('div');
      card.className = 'product-card';

      // Badges
      let badgeHtml = `<span class="badge" style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Disponible</span>`;
      let buttonHtml = `
        <button onclick="reserveProduct('${id}')" style="width: 100%; background: #d97706; color: white; border: none; padding: 0.6rem; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
          <i class="fa-solid fa-bookmark"></i> Réserver
        </button>`;

      if (p.isSold) {
        badgeHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:bold;">VENDU</span>`;
        buttonHtml = `
          <button disabled style="width: 100%; background: #ef4444; color: white; border: none; padding: 0.6rem; border-radius: 6px; font-weight: bold; cursor: not-allowed; font-size: 0.85rem;">
            Vendu
          </button>`;
      } else if (p.isReserved) {
        badgeHtml = `<span class="badge" style="background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Déjà réservé</span>`;
        buttonHtml = `
          <button disabled style="width: 100%; background: #9ca3af; color: white; border: none; padding: 0.6rem; border-radius: 6px; font-weight: bold; cursor: not-allowed; font-size: 0.85rem;">
            Non disponible
          </button>`;
      }

      // Controls Vendeuse
      let sellerControls = '';
      if (isSeller) {
        const safeTitle = (p.title || 'Article').replace(/'/g, "\\'");
        sellerControls = `
          <div style="display:flex; gap:0.4rem; margin-top:0.5rem; border-top:1px solid #eee; padding-top:0.5rem;">
            <button onclick="editProduct('${id}', '${safeTitle}', ${p.price || 0})" style="flex:1; background:#3b82f6; color:white; border:none; padding:0.4rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">
              <i class="fa-solid fa-pen"></i> Modifier
            </button>
            <button onclick="deleteProduct('${id}')" style="flex:1; background:#dc2626; color:white; border:none; padding:0.4rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">
              <i class="fa-solid fa-trash"></i> Supprimer
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="product-image">
          <img src="${imageUrl}" alt="${p.title || 'Article'}">
        </div>
        <div class="product-info" style="padding: 0.8rem;">
          ${badgeHtml}
          <h3 class="product-title" style="margin: 0.5rem 0 0.2rem 0; font-size: 1rem;">${p.title || 'Article'}</h3>
          <p class="product-price" style="color: #d97706; font-weight: bold; font-size: 0.95rem; margin-bottom: 0.8rem;">${p.price ? p.price.toLocaleString('fr-FR') : 0} XAF</p>
          ${buttonHtml}
          ${sellerControls}
        </div>
      `;
      productList.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur catalogue :", err);
  }
}

// --- MODIFIER / SUPPRIMER ARTICLE ---

window.editProduct = function(id, oldTitle, oldPrice) {
  let modal = document.getElementById('edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">Modifier l'article</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Nom de l'article</label>
        <input type="text" id="edit-title" value="${oldTitle}" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Prix (XAF)</label>
        <input type="number" id="edit-price" value="${oldPrice}" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <div id="edit-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem;">
          <button onclick="saveProductEdit('${id}')" style="flex:1; background:#3b82f6; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">Enregistrer</button>
          <button onclick="closeEditModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

window.saveProductEdit = function(id) {
  const newTitle = document.getElementById('edit-title').value.trim();
  const newPrice = parseInt(document.getElementById('edit-price').value, 10);
  const errDiv = document.getElementById('edit-error');

  if (!newTitle || isNaN(newPrice)) {
    errDiv.textContent = "Veuillez remplir correctement les champs.";
    return;
  }

  db.collection('products').doc(id).update({
    title: newTitle,
    price: newPrice
  }).then(() => {
    closeEditModal();
    loadCatalog();
  }).catch((err) => {
    errDiv.textContent = "Erreur : " + err.message;
  });
};

window.closeEditModal = function() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.remove();
};

window.deleteProduct = function(id) {
  let modal = document.getElementById('delete-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'delete-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 0.8rem;"></i>
        <h3 style="margin-bottom: 0.5rem;">Supprimer l'article ?</h3>
        <p style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 1.2rem;">Cette action est définitive et retirera l'article de la boutique.</p>
        
        <div style="display:flex; gap: 0.5rem;">
          <button onclick="confirmDeleteProduct('${id}')" style="flex:1; background:#dc2626; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">Supprimer</button>
          <button onclick="closeDeleteModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

window.confirmDeleteProduct = async function(id) {
  try {
    await db.collection('products').doc(id).delete();
    closeDeleteModal();
    loadCatalog();
  } catch (err) {
    alert("Erreur lors de la suppression : " + err.message);
  }
};

window.closeDeleteModal = function() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.remove();
};

window.reserveProduct = async function(productId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Veuillez vous connecter pour réserver cet article.");
    openLoginModal(false);
    return;
  }

  if (!confirm("Voulez-vous réserver cet article ? Vous allez être redirigé vers notre WhatsApp.")) return;

  try {
    const doc = await db.collection('products').doc(productId).get();
    const productData = doc.data();

    await db.collection('products').doc(productId).update({
      isReserved: true,
      reservedBy: user.uid,
      reservedByEmail: user.email
    });

    await db.collection('reservations').add({
      productId: productId,
      userId: user.uid,
      userEmail: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const clientName = user.email.replace('@destieshop.local', '');
    const textMsg = `Bonjour Destie Shop ! Je souhaite réserver l'article : *${productData.title}* (${productData.price} XAF).\nMon contact : ${clientName}`;
    const waUrl = `https://wa.me/${VENDEUSE_PHONE}?text=${encodeURIComponent(textMsg)}`;

    alert("Réservation enregistrée ! Redirection vers WhatsApp...");
    window.location.href = waUrl;

  } catch (err) {
    alert("Erreur lors de la réservation : " + err.message);
  }
};

window.markAsSold = async function(productId) {
  if (!confirm("Confirmer la vente de cet article ? Il sera définitivement marqué comme VENDU et passera dans les Achats du client.")) return;

  try {
    await db.collection('products').doc(productId).update({
      isSold: true,
      isReserved: false
    });

    alert("Vente validée !");
    loadReservationsView();
  } catch (err) {
    alert("Erreur : " + err.message);
  }
};

window.cancelReservation = async function(productId) {
  if (!confirm("Voulez-vous annuler cette réservation ? L'article redeviendra disponible dans le catalogue.")) return;

  try {
    await db.collection('products').doc(productId).update({
      isReserved: false,
      reservedBy: firebase.firestore.FieldValue.delete(),
      reservedByEmail: firebase.firestore.FieldValue.delete()
    });

    alert("Réservation annulée. L'article est de nouveau disponible !");
    loadReservationsView();
  } catch (err) {
    alert("Erreur lors de l'annulation : " + err.message);
  }
};

async function loadReservationsView() {
  const container = document.getElementById('app-content');
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <h3>Réservations</h3>
        <p style="color: #6b7280; margin-top: 0.5rem;">Connectez-vous pour voir vos réservations.</p>
        <button class="btn" style="margin-top: 1rem; background:#d97706; color:white; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;" onclick="openLoginModal(false)">Se connecter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:2rem;">Chargement des réservations...</div>`;

  try {
    const isSeller = user.email && user.email.trim().toLowerCase() === SELLER_EMAIL.toLowerCase();
    
    let query = isSeller 
      ? db.collection('products').where('isReserved', '==', true)
      : db.collection('products').where('reservedBy', '==', user.uid).where('isReserved', '==', true);

    const snapshot = await query.get();

    if (snapshot.empty) {
      container.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h3>Réservations</h3>
          <p style="color: #6b7280; margin-top: 0.5rem;">Aucune réservation en cours.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 1rem;">
        <h3 style="margin-bottom: 1rem;">${isSeller ? 'Réservations à traiter' : 'Mes Réservations en cours'}</h3>
        <div class="product-grid">
    `;

    snapshot.forEach(doc => {
      const p = doc.data();
      const id = doc.id;
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300';
      const clientContact = (p.reservedByEmail || 'Client').replace('@destieshop.local', '');

      html += `
        <div class="product-card">
          <div class="product-image"><img src="${imageUrl}"></div>
          <div class="product-info" style="padding:0.8rem;">
            <h3>${p.title || 'Article'}</h3>
            <p style="color:#d97706; font-weight:bold;">${p.price} XAF</p>
            ${isSeller ? `
              <p style="font-size:0.85rem; color:#4b5563; margin:0.4rem 0;">Client : <strong>${clientContact}</strong></p>
              
              <button onclick="markAsSold('${id}')" style="width:100%; background:#10b981; color:white; border:none; padding:0.5rem; border-radius:5px; font-weight:bold; cursor:pointer; margin-top:0.3rem;">
                <i class="fa-solid fa-check"></i> Valider la vente
              </button>
              
              <button onclick="cancelReservation('${id}')" style="width:100%; background:#ef4444; color:white; border:none; padding:0.5rem; border-radius:5px; font-weight:bold; cursor:pointer; margin-top:0.3rem;">
                <i class="fa-solid fa-xmark"></i> Annuler la réservation
              </button>
            ` : `
              <p style="font-size:0.8rem; color:#d97706; margin-top:0.4rem;">En attente de finalisation sur WhatsApp...</p>
            `}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur réservations :", err);
    container.innerHTML = `<div style="padding:2rem; text-align:center;">Erreur lors du chargement.</div>`;
  }
}

async function loadPurchasesView() {
  const container = document.getElementById('app-content');
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <h3>Mes Achats</h3>
        <p style="color: #6b7280; margin-top: 0.5rem;">Connectez-vous pour voir vos achats.</p>
        <button class="btn" style="margin-top: 1rem; background:#d97706; color:white; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;" onclick="openLoginModal(false)">Se connecter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:2rem;">Chargement de vos achats...</div>`;

  try {
    const isSeller = user.email && user.email.trim().toLowerCase() === SELLER_EMAIL.toLowerCase();

    let query = isSeller
      ? db.collection('products').where('isSold', '==', true)
      : db.collection('products').where('reservedBy', '==', user.uid).where('isSold', '==', true);

    const snapshot = await query.get();

    if (snapshot.empty) {
      container.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <i class="fa-solid fa-bag-shopping" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
          <h3>Historique des Achats</h3>
          <p style="color: #6b7280; margin-top: 0.5rem;">Aucun achat réalisé pour l'instant.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 1rem;">
        <h3 style="margin-bottom: 1rem;">${isSeller ? 'Historique Global des Ventes' : 'Mes Achats Confirmés'}</h3>
        <div class="product-grid">
    `;

    snapshot.forEach(doc => {
      const p = doc.data();
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300';
      const clientContact = (p.reservedByEmail || 'Client').replace('@destieshop.local', '');

      html += `
        <div class="product-card">
          <div class="product-image"><img src="${imageUrl}"></div>
          <div class="product-info" style="padding:0.8rem;">
            <span class="badge" style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:bold;">ACHETÉ</span>
            <h3 style="margin-top:0.3rem;">${p.title || 'Article'}</h3>
            <p style="color:#d97706; font-weight:bold;">${p.price} XAF</p>
            ${isSeller ? `<p style="font-size:0.8rem; color:#4b5563; margin-top:0.3rem;">Acheté par : <strong>${clientContact}</strong></p>` : ''}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur achats :", err);
    container.innerHTML = `<div style="padding:2rem; text-align:center;">Erreur lors du chargement des achats.</div>`;
  }
}

async function loadProfileView() {
  const container = document.getElementById('app-content');
  const user = firebase.auth().currentUser;

  if (user) {
    const isSeller = user.email && user.email.trim().toLowerCase() === SELLER_EMAIL.toLowerCase();
    const displayUser = user.email.replace('@destieshop.local', '');

    let sellerStatsHtml = '';
    if (isSeller) {
      try {
        const usersSnap = await db.collection('users').get();
        const totalUsers = usersSnap.size;

        sellerStatsHtml = `
          <div style="margin-top: 1rem; padding: 1rem; background: #feF3c7; border-radius: 6px; color: #92400e;">
            <h4 style="margin-bottom:0.5rem;"><i class="fa-solid fa-chart-line"></i> Tableau de bord Vendeuse</h4>
            <p style="font-size:0.95rem; margin-bottom:0.3rem;">👥 Nombre d'abonnés (clients inscrits) : <strong>${totalUsers}</strong></p>
          </div>
        `;
      } catch(e) {
        console.error(e);
      }
    }

    container.innerHTML = `
      <div style="padding: 1.5rem; background: white; border-radius: 8px; margin: 1rem;">
        <h3 style="margin-bottom: 0.5rem;">Mon Profil</h3>
        <p style="color: #4b5563;">Identifiant : <strong>${displayUser}</strong></p>
        ${sellerStatsHtml}
        <button class="btn btn-secondary" style="margin-top: 1.5rem; background:#4b5563; color:white; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;" onclick="logout()">Déconnexion</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <h3>Mon Profil</h3>
        <p style="color: #6b7280; margin-top: 0.5rem;">Vous n'êtes pas connecté.</p>
        <button class="btn" style="margin-top: 1rem; background:#d97706; color:white; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;" onclick="openLoginModal(false)">Se connecter</button>
      </div>
    `;
  }
}

window.openLoginModal = function(isSignup = false) {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">${isSignup ? 'Créer un compte Client' : 'Connexion'}</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Numéro de téléphone ou Email</label>
        <input type="text" id="auth-email" placeholder="ex: 066431082" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Mot de passe (au moins 6 caractères)</label>
        <input type="password" id="auth-pass" placeholder="••••••••" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <div id="auth-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem; margin-bottom: 1rem;">
          <button onclick="submitAuth(${isSignup})" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">
            ${isSignup ? "S'inscrire" : "Se connecter"}
          </button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>

        <div style="text-align: center; border-top: 1px solid #374151; padding-top: 0.8rem;">
          ${isSignup 
            ? `<span style="font-size:0.8rem; color:#9ca3af;">Déjà un compte ? <a href="#" onclick="openLoginModal(false)" style="color:#f59e0b; text-decoration:none;">Se connecter</a></span>`
            : `<span style="font-size:0.8rem; color:#9ca3af;">Pas encore de compte ? <a href="#" onclick="openLoginModal(true)" style="color:#f59e0b; text-decoration:none;">Créer un compte client</a></span>`
          }
        </div>
      </div>
    </div>
  `;
};

window.submitAuth = function(isSignup) {
  let inputVal = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const errDiv = document.getElementById('auth-error');

  if (!inputVal || !pass) {
    errDiv.textContent = "Veuillez remplir tous les champs.";
    return;
  }

  if (pass.length < 6) {
    errDiv.textContent = "Le mot de passe doit faire au moins 6 caractères.";
    return;
  }

  let email = inputVal.toLowerCase();
  if (!inputVal.includes('@')) {
    const cleanPhone = inputVal.replace(/\D/g, '');
    email = `${cleanPhone}@destieshop.local`;
  }

  errDiv.textContent = "Vérification...";

  if (isSignup) {
    firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(async (cred) => {
        await db.collection('users').doc(cred.user.uid).set({
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeModal();
        alert("Compte créé avec succès ! Vous êtes connecté.");
        switchView('catalog');
      })
      .catch((err) => {
        errDiv.textContent = "Erreur : " + err.message;
      });
  } else {
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(() => {
        closeModal();
        alert("Connexion réussie !");
        switchView('catalog');
      })
      .catch((err) => {
        errDiv.textContent = "Erreur : " + err.message;
      });
  }
};

window.logout = function() {
  firebase.auth().signOut().then(() => {
    alert("Déconnecté !");
    switchView('catalog');
  });
};

window.closeModal = function() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.remove();
  const addModal = document.getElementById('add-modal');
  if (addModal) addModal.remove();
};

window.openAddProductModal = function() {
  let modal = document.getElementById('add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 380px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">Nouveau Vêtement</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Nom de l'article</label>
        <input type="text" id="add-title" placeholder="ex: Ensemble Pagne" style="width:100%; padding: 0.5rem; margin-bottom: 0.8rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Prix (XAF)</label>
        <input type="number" id="add-price" placeholder="15000" style="width:100%; padding: 0.5rem; margin-bottom: 0.8rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Photo (Galerie / Téléphone)</label>
        <input type="file" id="add-file" accept="image/*" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">

        <div id="add-error" style="color: #f59e0b; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem;">
          <button id="btn-pub" onclick="submitProduct()" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">Publier</button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

window.submitProduct = async function() {
  const title = document.getElementById('add-title').value;
  const price = parseInt(document.getElementById('add-price').value, 10);
  const fileInput = document.getElementById('add-file');
  const errDiv = document.getElementById('add-error');
  const btnPub = document.getElementById('btn-pub');

  if (!title || !price || fileInput.files.length === 0) {
    errDiv.textContent = "Veuillez tout remplir et choisir une photo.";
    return;
  }

  btnPub.disabled = true;
  errDiv.textContent = "Traitement de l'image...";

  try {
    const file = fileInput.files[0];
    const imageUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    errDiv.textContent = "Enregistrement...";

    await db.collection('products').add({
      title: title,
      price: price,
      images: [imageUrl],
      isReserved: false,
      isSold: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal();
    alert("Article publié avec succès !");
    switchView('catalog');
  } catch (err) {
    errDiv.textContent = "Erreur : " + err.message;
    btnPub.disabled = false;
  }
};
