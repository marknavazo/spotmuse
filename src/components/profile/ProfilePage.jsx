import React, { useEffect, useState } from 'react'
import { Container, TextField, Button, Typography, Avatar, Box, IconButton } from '@mui/material'
import PhotoCamera from '@mui/icons-material/PhotoCamera'
import toast from 'react-hot-toast'
import auth from '../../firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/firestore'
import { storage } from '../../firebase/storage'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useTranslation } from 'react-i18next'
import { MenuItem, Select, FormControl, InputLabel } from '@mui/material'

export default function ProfilePage() {
  const user = auth.currentUser
  const [form, setForm] = useState({ fullName: '', birthDate: '', residence: '', photoURL: '', preferredLanguage: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { t, i18n } = useTranslation()
  const [lang, setLang] = useState(i18n.language)

  useEffect(() => {
    setLoading(true)
    const ref = doc(db, 'users', user.uid)
    getDoc(ref).then(snap => {
      if (snap.exists()) setForm(snap.data())
      const langFromProfile = snap.exists() ? snap.data().preferredLanguage : null
      if (langFromProfile) {
        setLang(langFromProfile)
        i18n.changeLanguage(langFromProfile)
      }
    }).finally(() => setLoading(false))
  }, [user])

  function handleLangChange(e) {
    const newLang = e.target.value
    setLang(newLang)
    setForm(prev => ({ ...prev, preferredLanguage: newLang }))
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)
      setForm({ ...form, photoURL })
      toast.success('Foto subida correctamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!user) return toast.error(t('No autenticado'))
    try {
      await setDoc(doc(db, 'users', user.uid), { ...form, uid: user.uid, preferredLanguage: lang }, { merge: true })
      i18n.changeLanguage(lang)
      toast.success(t('Perfil guardado correctamente'))
    } catch (error) {
      toast.error(t('Error al guardar el perfil'))
    }
  }

  if (!user) return <Typography>{t('Accede para editar tu perfil')}</Typography>

  return (
    <Container maxWidth="sm">
      <Typography variant="h5" sx={{ mb: 3 }}>{t('Mi perfil')}</Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Avatar 
          src={form.photoURL} 
          sx={{ width: 120, height: 120, mb: 2 }}
        >
          {form.fullName?.[0]?.toUpperCase()}
        </Avatar>
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="photo-upload"
          type="file"
          onChange={handlePhotoUpload}
          disabled={uploading}
        />
        <label htmlFor="photo-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<PhotoCamera />}
            disabled={uploading}
            sx={{ borderColor: '#1db954', color: '#1db954', '&:hover': { borderColor: '#1ed760', bgcolor: 'rgba(29, 185, 84, 0.1)' } }}
          >
            {uploading ? t('Subiendo...') : t('Cambiar foto')}
          </Button>
        </label>
      </Box>

      <TextField label={t('Nombre y apellidos')} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} fullWidth sx={{ mt: 2 }} />
      <TextField type="date" label={t('Fecha de nacimiento')} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} fullWidth sx={{ mt: 2 }} InputLabelProps={{ shrink: true }} />
      <TextField label={t('Lugar de residencia')} value={form.residence} onChange={e => setForm({ ...form, residence: e.target.value })} fullWidth sx={{ mt: 2 }} />
      <Box sx={{ mt: 2, mb: 2 }}>
        <FormControl variant="standard" sx={{ minWidth: 120 }}>
          <InputLabel>{t('Idioma')}</InputLabel>
          <Select value={lang} onChange={handleLangChange} label={t('Idioma')}>
            <MenuItem value="es">{t('Español')}</MenuItem>
            <MenuItem value="en">{t('Inglés')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Button variant="contained" onClick={save} sx={{ mt: 1, bgcolor: '#1db954', '&:hover': { bgcolor: '#1ed760' } }}>{t('Guardar')}</Button>
    </Container>
  )
}
