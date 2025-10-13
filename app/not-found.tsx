"use client";
import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const NotFoundPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      padding: 24
    }}>
      <h1 style={{ fontSize: 32, marginBottom: 16, color: '#222' }}>Page Doesn't Exist</h1>
      <p style={{ fontSize: 18, marginBottom: 32, color: '#555' }}>
        Sorry, the page you are looking for could not be found.
      </p>
      <div style={{ maxWidth: 320 }}>
        <DotLottieReact
          src="https://lottie.host/a7a21903-e127-464f-9b5c-7e8cd7cb9e7e/f9GklDS4ZR.lottie"
          loop
          autoplay
        />
      </div>
      <p style={{ marginTop: 32, color: '#888' }}>
        (Looks like you found a lost cat!)
      </p>
    </div>
  );
};

export default NotFoundPage;