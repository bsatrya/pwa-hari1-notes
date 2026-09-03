document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi PWA Hari 4 Berhasil Dimuat (IndexedDB + A2HS)');

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

  const defaultLat = -7.9666;
  const defaultLng = 112.6326;

  // --- 1. INISIALISASI INDEXEDDB ---
  function initIndexedDB() {
    const request = indexedDB.open('PWA_FieldDatabase', 1);

    request.onerror = (event) => {
      console.error('IndexedDB gagal dibuka:', event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB berhasil terhubung.');
      loadRecords(); // Muat data setelah DB siap
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      // Buat object store (tabel) jika belum ada dengan keyPath autoIncrement
      if (!database.objectStoreNames.contains('records')) {
        database.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        console.log('Object store "records" berhasil dibuat.');
      }
    };
  }

  initIndexedDB();

  // --- 2. FITUR A2HS (ADD TO HOME SCREEN) ---
  window.addEventListener('beforeinstallprompt', (e) => {
    // Cegah browser menampilkan banner default
    e.preventDefault();
    deferredPrompt = e;
    // Tampilkan tombol install kustom kita
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

  // --- 3. INISIALISASI PETA LEAFLET ---
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
        marker.bindPopup("<b>Lokasi Tugas Lapangan</b>").openPopup();
      },
      (error) => {
        geoStatus.textContent = 'Gagal mendeteksi posisi.';
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // --- 5. MANAJEMEN DATA INDEXEDDB (CRUD) ---
  function loadRecords() {
    if (!db) return;

    notesList.innerHTML = '';
    const transaction = db.transaction(['records'], 'readonly');
    const store = transaction.objectStore('records');
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;

      if (records.length === 0) {
        notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada data tersimpan di IndexedDB.</p>';
        return;
      }

      records.reverse().forEach((record) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';

        const contentDiv = document.createElement('div');
        
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
      alert('Nama, Nomor Telepon, dan Catatan wajib diisi!');
      return;
    }

    const newRecord = {
      name: name,
      phone: phone,
      note: note,
      coords: currentCoords || { lat: defaultLat, lng: defaultLng },
      date: new Date().toISOString()
    };

    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    const request = store.add(newRecord);

    request.onsuccess = () => {
      console.log('Data berhasil disimpan ke IndexedDB');
      nameInput.value = '';
      phoneInput.value = '';
      noteInput.value = '';
      currentCoords = null;
      geoStatus.textContent = 'Belum ada lokasi dipilih';
      loadRecords();
    };

    request.onerror = (event) => {
      console.error('Gagal menyimpan data:', event.target.error);
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