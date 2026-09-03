document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi PWA Hari 3 Berhasil Dimuat');

  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const geoBtn = document.getElementById('geoBtn');
  const geoStatus = document.getElementById('geoStatus');
  const notesList = document.getElementById('notesList');

  let currentCoords = null;
  let map = null;
  let marker = null;

  // --- 1. INISIALISASI PETA LEAFLET ---
  // Default koordinat awal (misal: pusat kota Malang, Indonesia)
  const defaultLat = -7.9666;
  const defaultLng = 112.6326;

  function initMap(lat = defaultLat, lng = defaultLng) {
    if (!map) {
      // Inisialisasi peta pada elemen dengan id="map"
      map = L.map('map').setView([lat, lng], 13);

      // Memuat layer tile peta gratis dari OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    } else {
      map.setView([lat, lng], 15);
    }

    // Tambahkan atau pindahkan marker posisi
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }
  }

  // Panggil peta saat pertama kali halaman dimuat
  initMap();

  // --- 2. REGISTRASI SERVICE WORKER ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.geolocation // sekadar pengaman baris
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW terdaftar:', reg.scope))
        .catch((err) => console.error('SW gagal:', err));
    });
  }

  // --- 3. GEOLOKASI & PEMBARUAN PETA ---
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.textContent = 'Geolokasi tidak didukung oleh browser.';
      return;
    }

    geoStatus.textContent = 'Mendeteksi posisi satelit GPS...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        currentCoords = { lat: latitude, lng: longitude };
        
        geoStatus.textContent = `Lokasi: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        // Perbarui tampilan peta dan letakkan marker di posisi pengguna
        initMap(latitude, longitude);
        marker.bindPopup("<b>Posisi Anda Saat Ini</b>").openPopup();
      },
      (error) => {
        geoStatus.textContent = 'Gagal mendeteksi lokasi atau izin ditolak.';
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // --- 4. MANAJEMEN LOCALSTORAGE & RENDERING ---
  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('my_notes_map')) || [];
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada catatan peta tersimpan.</p>';
      return;
    }

    notes.forEach((note, index) => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';

      const contentDiv = document.createElement('div');
      
      const textSpan = document.createElement('span');
      textSpan.textContent = note.text;
      contentDiv.appendChild(textSpan);

      if (note.coords) {
        const metaSpan = document.createElement('small');
        metaSpan.className = 'note-meta';
        metaSpan.textContent = `📍 Koordinat: ${note.coords.lat.toFixed(4)}, ${note.coords.lng.toFixed(4)}`;
        contentDiv.appendChild(metaSpan);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Hapus';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', () => deleteNote(index));

      noteItem.appendChild(contentDiv);
      noteItem.appendChild(deleteBtn);
      notesList.appendChild(noteItem);
    });
  }

  function saveNote() {
    const text = noteInput.value.trim();

    if (text === '') {
      alert('Catatan tidak boleh kosong!');
      return;
    }

    const newNote = {
      text: text,
      coords: currentCoords || { lat: defaultLat, lng: defaultLng },
      date: new Date().toISOString()
    };

    const notes = JSON.parse(localStorage.getItem('my_notes_map')) || [];
    notes.push(newNote);
    localStorage.setItem('my_notes_map', JSON.stringify(notes));

    noteInput.value = '';
    currentCoords = null;
    geoStatus.textContent = 'Belum ada lokasi dipilih';
    loadNotes();
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('my_notes_map')) || [];
    notes.splice(index, 1);
    localStorage.setItem('my_notes_map', JSON.stringify(notes));
    loadNotes();
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveNote);
  }

  loadNotes();
});