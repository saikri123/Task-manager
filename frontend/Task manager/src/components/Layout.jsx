import React from 'react'
import  Navbar from './Navbar'

export const Layout = ({handleLogout,user}) => {
  return (
    <div className='min-h-screen bg-grey-50'>
      <Navbar />
    </div>
  )
}

export default Layout
