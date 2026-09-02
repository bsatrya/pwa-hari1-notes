document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplikasi PWA Hari 1 Berhasil Dimuat');

  const noteInput = document.getElementById('noteInput');
  const saveBtn = document.getElementById('saveBtn');
  const notesList = document.getElementById('notesList');

  // Registrasi Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW terdaftar:', reg.scope))
        .catch((err) => console.error('SW gagal:', err));
    });
  }

  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    notesList.innerHTML = '';

    if (notes.length === 0) {
      notesList.innerHTML = '<p style="text-align: center; color: #64748b; margin-top: 15px;">Belum ada catatan tersimpan.</p>';
      return;
    }

    notes.forEach((noteText, index) => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';

      const textSpan = document.createElement('span');
      textSpan.textContent = noteText;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Hapus';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', () => deleteNote(index));

      noteItem.appendChild(textSpan);
      noteItem.appendChild(deleteBtn);
      notesList.appendChild(noteItem);
    });
  }

  function saveNote() {
    const text = noteInput.value.trim();
    console.log('Tombol simpan diklik, teks:', text);

    if (text === '') {
      alert('Catatan tidak boleh kosong!');
      return;
    }

    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    notes.push(text);
    localStorage.setItem('my_notes', JSON.stringify(notes));

    noteInput.value = '';
    loadNotes();
  }

  function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('my_notes')) || [];
    notes.splice(index, 1);
    localStorage.setItem('my_notes', JSON.stringify(notes));
    loadNotes();
  }

  // Pastikan event listener terpasang dengan benar
  if (saveBtn) {
    saveBtn.addEventListener('click', saveNote);
  } else {
    console.error('Element saveBtn tidak ditemukan!');
  }

  loadNotes();
});