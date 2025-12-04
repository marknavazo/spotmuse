import { Navigate } from 'react-router-dom'
import auth from '../../firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import React, { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(auth.currentUser)
  const [checked, setChecked] = useState(!!auth.currentUser)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setChecked(true)
    })
    return () => unsub()
  }, [])

  if (!checked) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
