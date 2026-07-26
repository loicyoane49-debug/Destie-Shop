document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let currentUser = null;

function initApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker enregistré avec succès.'))
      .catch((err) => console.log('Échec d\'enregistrement du Service Worker :', err));
  }

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateHeaderAuthUI();
    loadCatalog();
  });
}

function updateHeaderAuthUI() {
  const headerBtn = document.getElementById('auth-header-btn');
  if (currentUser) {
    headerBtn.innerHTML = `<button class="btn btn-secondary" onclick="logout()"><i class="fa-solid fa-sign-out-alt"></i> Déconnexion</button>`;
  } else {
    headerBtn.innerHTML = `<button class="btn btn-secondary" onclick="openLoginModal()"><i class="fa-solid fa-user"></i> Connexion</button>`;
  }
}

async function loadCatalog() {
  const productListEl = document.getElementById('product-list');
  productListEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Chargement des articles de Pointe-Noire...</p>';

  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) {
      productListEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-light);">Aucun article disponible pour le moment.</p>';
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      const product = doc.data();
      const productId = doc.id;
      const isReserved = product.isReserved || false;
      
      const badgeClass = isReserved ? 'badge reserved' : 'badge available';
      const badgeText = isReserved ? 'Réservé' : 'Disponible';
      
      const primaryImage = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/180';

      html += `
        <div class="product-card">
          <img src="${primaryImage}" alt="${product.title}" class="product-img">
          <div class="product-info">
            <span class="${badgeClass}">${badgeText}</span>
            <div class="product-title">${escapeHtml(product.title)}</div>
            <div class="product-price">${product.price.toLocaleString('fr-FR')} XAF</div>
            <button class="btn" style="margin-top: auto;" onclick="openReservationModal('${productId}', '${escapeHtml(product.title)}', ${product.price})">
              ${isReserved ? 'Indisponible' : 'Réserver'}
            </button>
          </div>
        </div>
      `;
    });

    productListEl.innerHTML = html;
  } catch (error) {
    console.error("Erreur lors du chargement du catalogue :", error);
    productListEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Erreur de chargement des articles.</p>';
  }
}

function openReservationModal(productId, productTitle, productPrice) {
  if (!currentUser) {
    alert("Veuillez vous connecter pour effectuer une réservation.");
    openLoginModal();
    return;
  }

  let modalContainer = document.getElementById('modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 1rem;">
      <div style="background: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom: 0.5rem; color: var(--primary-dark);">Réserver un article</h3>
        <p style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 1rem;"><strong>${productTitle}</strong> - ${productPrice.toLocaleString('fr-FR')} XAF</p>
        
        <form id="reservation-form" onsubmit="submitReservation(event, '${productId}', '${productTitle}', ${productPrice})">
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Votre Nom complet</label>
            <input type="text" id="res-name" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Numéro de téléphone (WhatsApp)</label>
            <input type="tel" id="res-phone" placeholder="+242 06..." required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Message ou précision (Optionnel)</label>
            <textarea id="res-msg" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; height: 60px;"></textarea>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" class="btn" style="flex: 1;">Valider la réservation</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function submitReservation(event, productId, productTitle, productPrice) {
  event.preventDefault();
  
  const clientName = document.getElementById('res-name').value;
  const clientPhone = document.getElementById('res-phone').value;
  const message = document.getElementById('res-msg').value;

  const reservationData = {
    clientId: currentUser.uid,
    clientName: clientName,
    clientPhone: clientPhone,
    productId: productId,
    productTitle: productTitle,
    productPrice: productPrice,
    quantity: 1,
    totalAmount: productPrice,
    status: 'pending_confirmation',
    message: message,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  try {
    const batch = db.batch();
    
    const resRef = db.collection('reservations').doc();
    batch.set(resRef, reservationData);

    const productRef = db.collection('products').doc(productId);
    batch.update(productRef, { isReserved: true });

    await batch.commit();

    closeModal();
    alert("Réservation enregistrée avec succès ! Veuillez contacter la vendeuse pour finaliser le paiement hors application.");
    
    const vendorPhone = "24206000000"; // Remplacez par votre numéro WhatsApp (sans le +)
    const waText = encodeURIComponent(`Bonjour, je viens de réserver l'article "${productTitle}" sur Destie Shop. Mon nom est ${clientName}. Comment procéder au paiement ?`);
    window.open(`https://wa.me/${vendorPhone}?text=${waText}`, '_blank');

    loadCatalog();
  } catch (error) {
    console.error("Erreur lors de la réservation :", error);
    alert("Une erreur est survenue lors de la réservation.");
  }
}

function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.innerHTML = '';
}

function openLoginModal() {
  const phone = prompt("Entrez votre numéro de téléphone (ex: 061234567) :");
  if (phone) {
    // On nettoie le numéro pour en faire un email unique en arrière-plan
    const cleanPhone = phone.replace(/\D/g, '');
    const fakeEmail = `${cleanPhone}@destieshop.local`;
    
    const password = prompt("Choisissez un mot de passe (minimum 6 caractères) :");
    if (password) {
      auth.signInWithEmailAndPassword(fakeEmail, password)
        .catch(() => {
          auth.createUserWithEmailAndPassword(fakeEmail, password)
            .catch(err => alert("Erreur d'authentification : " + err.message));
        });
    }
  }
}

function logout() {
  auth.signOut();
}

function switchView(viewName) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  if (viewName === 'catalog') {
    loadCatalog();
  } else if (viewName === 'reservations') {
    loadUserReservations();
  } else if (viewName === 'profile') {
    loadProfileView();
  }
}

async function loadUserReservations() {
  const contentEl = document.getElementById('app-content');
  if (!currentUser) {
    contentEl.innerHTML = '<p style="text-align: center; padding: 2rem;">Veuillez vous connecter pour voir vos réservations.</p>';
    return;
  }
  
  contentEl.innerHTML = '<p style="text-align: center; padding: 2rem;">Chargement de vos réservations...</p>';
  try {
    const snapshot = await db.collection('reservations').where('clientId', '==', currentUser.uid).get();
    if (snapshot.empty) {
      contentEl.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">Vous n\'avez aucune réservation en cours.</p>';
      return;
    }

    let html = '<h2 style="margin-bottom: 1rem; font-size: 1.2rem;">Mes Réservations</h2><div style="display: flex; flex-direction: column; gap: 1rem;">';
    snapshot.forEach(doc => {
      const res = doc.data();
      let statusBadge = '';
      if (res.status === 'pending_confirmation') statusBadge = '<span class="badge" style="background:#fef3c7; color:#92400e;">En attente de paiement / confirmation</span>';
      else if (res.status === 'confirmed') statusBadge = '<span class="badge available">Confirmée</span>';
      else if (res.status === 'cancelled') statusBadge = '<span class="badge reserved">Annulée</span>';

      html += `
        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(res.productTitle)}</div>
          <div style="color: var(--primary-dark); font-weight: bold; margin-bottom: 0.5rem;">${res.totalAmount.toLocaleString('fr-FR')} XAF</div>
          <div style="margin-bottom: 0.5rem;">${statusBadge}</div>
          <p style="font-size: 0.8rem; color: var(--text-light);">Contactez la vendeuse sur WhatsApp pour valider votre paiement hors application.</p>
        </div>
      `;
    });
    html += '</div>';
    contentEl.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

function loadProfileView() {
  const contentEl = document.getElementById('app-content');
  if (!currentUser) {
    contentEl.innerHTML = '<p style="text-align: center; padding: 2rem;">Veuillez vous connecter pour voir votre profil.</p>';
    return;
  }
  contentEl.innerHTML = `
    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h2 style="margin-bottom: 1rem; font-size: 1.2rem;">Mon Profil Client</h2>
      <p style="margin-bottom: 0.5rem;"><strong>Email :</strong> ${currentUser.email}</p>
      <p style="margin-bottom: 1.5rem;"><strong>UID :</strong> ${currentUser.uid}</p>
      <button class="btn btn-secondary" onclick="logout()">Se déconnecter</button>
    </div>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
