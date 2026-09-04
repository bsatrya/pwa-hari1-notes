import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Konfigurasi Firebase dari Project Settings Anda
const firebaseConfig = {
  apiKey: "AIzaSyBZ8UobDfYZG_90GWpWvPeIeReseXuEJA0",
  authDomain: "forum-warga-test.firebaseapp.com",
  projectId: "forum-warga-test",
  storageBucket: "forum-warga-test.firebasestorage.app",
  messagingSenderId: "605136480213",
  appId: "1:605136480213:web:06bc16d4e5d4124b6bef5c",
  measurementId: "G-T7HT1D1EK3"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi Forum Keluhan & Info Warga PWA (Firebase Cloud) Berhasil Dimuat');

  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const locationNameInput = document.getElementById('locationNameInput');
  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const geoBtn = document.getElementById('geoBtn');
  const geoStatus = document.getElementById('geoStatus');
  const notesList = document.getElementById('notesList');
  const installBtn = document.getElementById('installBtn');
  const suggestionsList = document.getElementById('suggestionsList'); // Elemen penampung list saran lokasi

  let currentCoords = null;
  let map = null;
  let marker = null;
  let deferredPrompt = null;
  let searchTimeout = null;

  // Koordinat default (pusat kota Malang)
  const defaultLat = -7.9666;
  const defaultLng = 112.6326;

  // --- 1. REGISTRASI SERVICE WORKER ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW terdaftar:', reg.scope))
        .catch((err) => console.error('SW gagal:', err));
    });
  }

  // --- 2. FITUR A2HS (ADD TO HOME SCREEN) ---
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';

    installBtn.addEventListener('click', () => {
      installBtn.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Pengguna menerima instalasi PWA');
        } else {
          console.log('Pengguna menolak instalasi PWA');
        }
        deferredPrompt = null;
      });
    });
  });

  // --- 3. INISIALISASI PETA LEAFLET (DENGAN KLIK MANUAL) ---
  function initMap(lat = defaultLat, lng = defaultLng) {
    if (!map) {
      map = L.map('map').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Klik pada peta untuk memilih lokasi manual
      map.on('click', (e) => {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        currentCoords = { lat: clickedLat, lng: clickedLng };

        if (marker) {
          marker.setLatLng([clickedLat, clickedLng]);
        } else {
          marker = L.marker([clickedLat, clickedLng]).addTo(map);
        }

        marker.bindPopup("<b>Lokasi Laporan Dipilih Manual</b>").openPopup();
        geoStatus.textContent = `Lokasi Manual: ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
      });

    } else {
      map.setView([lat, lng], 15);
    }

    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }
  }

  initMap();

  // --- 4. GEOLOKASI ---
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.textContent = 'Geolokasi tidak didukung.';
      return;
    }

    geoStatus.textContent = 'Mendeteksi posisi GPS...';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        currentCoords = { lat, lng };
        geoStatus.textContent = `Lokasi: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        initMap(lat, lng);
        marker.bindPopup("<b>Lokasi Keluhan / Kegiatan</b>").openPopup();
      },
      (error) => {
        geoStatus.textContent = 'Gagal mendeteksi posisi.';
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // --- 5. PENCARIAN OTOMATIS LOKASI (AUTOCOMPLETE NOMINATIM) ---
  if (locationNameInput && suggestionsList) {
    locationNameInput.addEventListener('input', (e) => {
      const keyword = e.target.value.trim();
      clearTimeout(searchTimeout);

      if (keyword.length < 3) {
        suggestionsList.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(() => {
        const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}&countrycodes=id&limit=5`;

        fetch(searchUrl)
          .then(response => response.json())
          .then(data => {
            suggestionsList.innerHTML = '';
            if (data.length === 0) return;

            data.forEach(place => {
              const item = document.createElement('div');
              item.className = 'autocomplete-suggestion';
              item.textContent = place.display_name;

              item.addEventListener('click', () => {
                locationNameInput.value = place.display_name;
                suggestionsList.innerHTML = '';

                const lat = parseFloat(place.lat);
                const lon = parseFloat(place.lon);

                currentCoords = { lat: lat, lng: lon };
                geoStatus.textContent = `Lokasi Dipilih: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

                if (map) {
                  map.setView([lat, lon], 16);
                  if (marker) {
                    marker.setLatLng([lat, lon]);
                  } else {
                    marker = L.marker([lat, lon]).addTo(map);
                  }
                  marker.bindPopup(`<b>${place.display_name}</b>`).openPopup();
                }
              });

              suggestionsList.appendChild(item);
            });
          })
          .catch(err => console.error('Gagal mengambil data lokasi:', err));
      }, 400);
    });

    document.addEventListener('click', (e) => {
      if (!locationNameInput.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.innerHTML = '';
      }
    });
  }

  // --- 6. REAL-TIME CLOUD FIRESTORE & RENDERING ---
  function loadRecords() {
    notesList.innerHTML = '';
    const q = query(collection(db, "reports"), orderBy("date", "desc"));

    onSnapshot(q, (querySnapshot) => {
      notesList.innerHTML = '';

      if (querySnapshot.empty) {
        notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada keluhan atau informasi tersimpan di Cloud.</p>';
        return;
      }

      querySnapshot.forEach((docSnap) => {
        const record = { id: docSnap.id, ...docSnap.data() };
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';

        const contentDiv = document.createElement('div');
        
        if (record.date) {
          const dateObj = new Date(record.date);
          const formattedDate = dateObj.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const timeSpan = document.createElement('small');
          timeSpan.className = 'time-meta';
          timeSpan.style.color = '#64748b';
          timeSpan.style.display = 'block';
          timeSpan.style.marginBottom = '4px';
          timeSpan.textContent = `🕒 Dikirim pada: ${formattedDate}`;
          contentDiv.appendChild(timeSpan);
        }

        const contactSpan = document.createElement('span');
        contactSpan.className = 'contact-meta';
        contactSpan.textContent = `👤 ${record.name} (${record.email})`;
        contentDiv.appendChild(contactSpan);

        if (record.locationName) {
          const locNameSpan = document.createElement('span');
          locNameSpan.style.display = 'block';
          locNameSpan.style.fontWeight = '500';
          locNameSpan.style.color = '#334155';
          locNameSpan.textContent = `📍 Area: ${record.locationName}`;
          contentDiv.appendChild(locNameSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = record.note;
        contentDiv.appendChild(textSpan);

        if (record.coords) {
          const metaSpan = document.createElement('small');
          metaSpan.className = 'note-meta clickable-coord';
          metaSpan.textContent = `🗺️ Koordinat: ${record.coords.lat.toFixed(4)}, ${record.coords.lng.toFixed(4)}`;
          
          metaSpan.addEventListener('click', () => {
            if (map) {
              map.setView([record.coords.lat, record.coords.lng], 16);
              if (marker) {
                marker.setLatLng([record.coords.lat, record.coords.lng]);
              } else {
                marker = L.marker([record.coords.lat, record.coords.lng]).addTo(map);
              }
              marker.bindPopup(`<b>${record.locationName || 'Lokasi Laporan'}</b><br>${record.note}`).openPopup();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          });

          contentDiv.appendChild(metaSpan);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Hapus';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => deleteRecord(record.id));

        noteItem.appendChild(contentDiv);
        noteItem.appendChild(deleteBtn);
        notesList.appendChild(noteItem);
      });
    });
  }

  loadRecords();

  // --- 7. MENYIMPAN DATA KE CLOUD FIRESTORE ---
  async function saveRecord() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const locationName = locationNameInput.value.trim();
    const note = noteInput.value.trim();

    let missingFields = [];
    if (name === '') missingFields.push('Nama Pengirim');
    if (email === '') missingFields.push('Alamat Email');
    if (note === '') missingFields.push('Isi Informasi/Keluhan');

    if (missingFields.length > 0) {
      alert(`Mohon isi bagian yang belum lengkap: ${missingFields.join(', ')}.`);
      return;
    }

    const newRecord = {
      name: name,
      email: email,
      locationName: locationName || 'Lokasi Peta Dipilih',
      note: note,
      coords: currentCoords || { lat: defaultLat, lng: defaultLng },
      date: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "reports"), newRecord);
      console.log('Informasi berhasil dipublikasikan ke Firebase Cloud');
      
      nameInput.value = '';
      emailInput.value = '';
      locationNameInput.value = '';
      noteInput.value = '';
      currentCoords = null;
      geoStatus.textContent = 'Belum ada lokasi dipilih';
    } catch (error) {
      console.error('Gagal menyimpan ke Firebase:', error);
      alert('Gagal mengirim laporan. Periksa koneksi internet Anda.');
    }
  }

  // --- 8. MENGHAPUS DATA DARI CLOUD FIRESTORE ---
  async function deleteRecord(id) {
    if (confirm('Yakin ingin menghapus informasi ini?')) {
      try {
        await deleteDoc(doc(db, "reports", id));
        console.log(`Data dengan ID ${id} berhasil dihapus dari Cloud`);
      } catch (error) {
        console.error('Gagal menghapus data:', error);
      }
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveRecord);
  }
});