document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi PWA Hari 2 Berhasil Dimuat');

  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const geoBtn = document.getElementById('geoBtn');
  const geoStatus = document.getElementById('geoStatus');
  const notesList = document.getElementById('notesList');

  // Variabel untuk menyimpan data koordinat sementara sebelum disimpan
  let currentCoords = null;

  // --- 1. REGISTRASI SERVICE WORKER (Diperbarui ke v2/v3) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW terdaftar:', reg.scope))
        .catch((err) => console.error('SW gagal:', err));
    });
  }

  // --- 2. FITUR GEOLOKASI ---
  geoBtn.addEventListener('click', () => {
    // Memeriksa apakah browser mendukung Geolocation API
    if (!navigator.geolocation) {
      geoStatus.textContent = 'Geolokasi tidak didukung oleh browser Anda.';
      return;
    }

    geoStatus.textContent = 'Mendeteksi posisi perangkat...';

    // Mengambil posisi satu kali menggunakan getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // Simpan ke variabel lokal
        currentCoords = { lat: latitude, lng: longitude };
        
        geoStatus.textContent = `Lokasi didapat: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        console.log('Koordinat berhasil diambil:', currentCoords);
      },
      (error) => {
        console.error('Gagal mendeteksi lokasi:', error);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            geoStatus.textContent = 'Izin akses lokasi ditolak oleh pengguna.';
            break;
          case error.POSITION_UNAVAILABLE:
            geoStatus.textContent = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            geoStatus.textContent = 'Waktu permintaan lokasi habis.';
            break;
          default:
            geoStatus.textContent = 'Terjadi kesalahan yang tidak diketahui.';
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });

  // --- 3. MANAJEMEN LOCALSTORAGE & RENDERING ---
  function loadNotes() {
    // Sekarang data catatan disimpan dalam bentuk objek (teks + koordinat)
    const notes = JSON.parse(localStorage.getItem('my_notes_geo')) || [];
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada catatan geolokasi tersimpan.</p>';
      return;
    }

    notes.forEach((note, index) => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';

      const contentDiv = document.createElement('div');
      
      const textSpan = document.createElement('span');
      textSpan.textContent = note.text;
      contentDiv.appendChild(textSpan);

      // Jika catatan memiliki data koordinat, tampilkan sebagai metadata
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

    // Buat objek catatan yang merangkap teks dan koordinat geolokasi (jika ada)
    const newNote = {
      text: text,
      coords: currentCoords,
      date: new Date().toISOString()
    };

    const notes = JSON.parse(localStorage.getItem('my_notes_geo')) || [];
    notes.push(newNote);
    localStorage.setItem('my_notes_geo', JSON.stringify(notes));

    // Reset form dan variabel koordinat
    noteInput.value = '';
    currentCoords = null;
    geoStatus.textContent = 'Belum ada lokasi dipilih';
    loadNotes();
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('my_notes_geo')) || [];
    notes.splice(index, 1);
    localStorage.setItem('my_notes_geo', JSON.stringify(notes));
    loadNotes();
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveNote);
  }

  loadNotes();
});