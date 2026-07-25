import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './component/Layout/Layout';
import Home from './component/Home';


const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          {publicRoutes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
          <Route path="/" element={<Home />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;