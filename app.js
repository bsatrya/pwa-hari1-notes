document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi Forum Keluhan & Info Warga PWA Berhasil Dimuat');

  const nameInput = document.getElementById('nameInput');
  const phoneInput = document.getElementById('phoneInput');
  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const geoBtn = document.getElementById('geoBtn');
  const geoStatus = document.getElementById('geoStatus');
  const notesList = document.getElementById('notesList');
  const installBtn = document.getElementById('installBtn');

  let currentCoords = null;
  let map = null;
  let marker = null;
  let db = null;
  let deferredPrompt = null;

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

  // --- 2. INISIALISASI INDEXEDDB ---
  function initIndexedDB() {
    const request = indexedDB.open('PWA_FieldDatabase', 1);

    request.onerror = (event) => {
      console.error('IndexedDB gagal dibuka:', event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB berhasil terhubung.');
      loadRecords();
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('records')) {
        database.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        console.log('Object store "records" berhasil dibuat.');
      }
    };
  }

  initIndexedDB();

  // --- 3. FITUR A2HS (ADD TO HOME SCREEN) ---
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

  // --- 4. INISIALISASI PETA LEAFLET ---
  function initMap(lat = defaultLat, lng = defaultLng) {
    if (!map) {
      map = L.map('map').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
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

  // --- 5. GEOLOKASI ---
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

  // --- 6. MANAJEMEN DATA INDEXEDDB & RENDERING ---
  function loadRecords() {
    if (!db) return;

    notesList.innerHTML = '';
    const transaction = db.transaction(['records'], 'readonly');
    const store = transaction.objectStore('records');
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;

      if (records.length === 0) {
        notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada keluhan atau informasi tersimpan.</p>';
        return;
      }

      records.reverse().forEach((record) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';

        const contentDiv = document.createElement('div');
        
        // Format Waktu Kirim (Timestamp)
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
        contactSpan.textContent = `👤 ${record.name} (${record.phone})`;
        contentDiv.appendChild(contactSpan);

        const textSpan = document.createElement('span');
        textSpan.textContent = record.note;
        contentDiv.appendChild(textSpan);

        if (record.coords) {
          const metaSpan = document.createElement('small');
          metaSpan.className = 'note-meta';
          metaSpan.textContent = `📍 Koordinat: ${record.coords.lat.toFixed(4)}, ${record.coords.lng.toFixed(4)}`;
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
    };
  }

  function saveRecord() {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const note = noteInput.value.trim();

    if (name === '' || phone === '' || note === '') {
      alert('Nama, Nomor Telepon, dan Isi Informasi/Keluhan wajib diisi!');
      return;
    }

    const newRecord = {
      name: name,
      phone: phone,
      note: note,
      coords: currentCoords || { lat: defaultLat, lng: defaultLng },
      date: new Date().toISOString() // Menyimpan stempel waktu standar ISO
    };

    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    const request = store.add(newRecord);

    request.onsuccess = () => {
      console.log('Informasi berhasil dipublikasikan ke IndexedDB');
      nameInput.value = '';
      phoneInput.value = '';
      noteInput.value = '';
      currentCoords = null;
      geoStatus.textContent = 'Belum ada lokasi dipilih';
      loadRecords();
    };

    request.onerror = (event) => {
      console.error('Gagal menyimpan informasi:', event.target.error);
    };
  }

  function deleteRecord(id) {
    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`Data dengan ID ${id} berhasil dihapus`);
      loadRecords();
    };

    request.onerror = (event) => {
      console.error('Gagal menghapus data:', event.target.error);
    };
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveRecord);
  }
});