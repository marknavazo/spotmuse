import React, { useEffect } from 'react'
import { Button, Container, Typography, Box } from '@mui/material'
import toast from 'react-hot-toast'
import { loginWithGoogle } from '../../firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../../firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // If already authenticated, redirect to albums
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) navigate('/albums')
    })
    return () => unsub()
  }, [navigate])

  async function handleLogin() {
    try {
      await loginWithGoogle()
      toast.success(t('Sesión iniciada'))
      navigate('/albums')
    } catch (err) {
      console.error(err)
      toast.error(t('Error al iniciar sesión'))
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4">{t('Bienvenido a SpotMuse')}</Typography>
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={handleLogin}>{t('Acceder con Google')}</Button>
      </Box>
    </Container>
  )
}
