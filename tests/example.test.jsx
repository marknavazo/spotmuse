import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Login from '../src/components/auth/Login'

describe('Login', () => {
  it('muestra el título', () => {
    render(<Login />)
    expect(screen.getByText(/Bienvenido a SpotMuse/i)).toBeDefined()
  })
})
