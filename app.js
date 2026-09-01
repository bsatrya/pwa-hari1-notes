// Menjalankan skrip setelah seluruh DOM halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const notesList = document.getElementById('notesList');

  // --- 1. REGISTRASI SERVICE WORKER ---
  // Memeriksa apakah browser mendukung fitur Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker berhasil didaftarkan dengan cakupan:', registration.scope);
        })
        .catch((error) => {
          console.error('Gagal mendaftarkan Service Worker:', error);
        });
    });
  }

  // --- 2. MANAJEMEN LOCALSTORAGE ---
  // Fungsi untuk memuat dan merender catatan dari localStorage
  function loadNotes() {
    // Mengambil data string JSON dari localStorage, jika kosong kembalikan array kosong
    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    
    // Kosongkan kontainer HTML sebelum merender ulang
    notesList.innerHTML = '';

    // Jika tidak ada catatan, tampilkan pesan informatif
    if (notes.length === 0) {
      notesList.innerHTML = '<p style="text-align: center; color: #64748b;">Belum ada catatan tersimpan.</p>';
      return;
    }

    // Looping setiap catatan dan buat elemen HTML-nya secara dinamis
    notes.forEach((noteText, index) => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';

      const textSpan = document.createElement('span');
      textSpan.textContent = noteText;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Hapus';
      deleteBtn.className = 'delete-btn';
      
      // Event listener untuk tombol hapus berdasarkan indeks array
      deleteBtn.addEventListener('click', () => {
        deleteNote(index);
      });

      // Gabungkan elemen ke dalam DOM
      noteItem.appendChild(textSpan);
      noteItem.appendChild(deleteBtn);
      notesList.appendChild(noteItem);
    });
  }

  // Fungsi untuk menyimpan catatan baru ke localStorage
  function saveNote() {
    const text = noteInput.value.trim();
    
    // Validasi input agar tidak menyimpan catatan kosong
    if (text === '') {
      alert('Catatan tidak boleh kosong!');
      return;
    }

    // Ambil data lama, tambahkan catatan baru ke dalam array
    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    notes.push(text);

    // Simpan kembali array yang telah diperbarui ke dalam localStorage
    localStorage.setItem('my_notes', JSON.stringify(notes));

    // Bersihkan textarea dan muat ulang daftar catatan di UI
    noteInput.value = '';
    loadNotes();
  }

  // Fungsi untuk menghapus catatan spesifik berdasarkan indeksnya
  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    
    // Hapus 1 elemen pada posisi indeks tertentu menggunakan splice
    notes.splice(index, 1);

    // Perbarui localStorage dan render ulang UI
    localStorage.setItem('my_notes', JSON.stringify(notes));
    loadNotes();
  }

  // Event listener pada tombol simpan
  saveBtn.addEventListener('click', saveNode);

  // Panggil fungsi loadNotes saat pertama kali aplikasi dibuka
  loadNotes();
});