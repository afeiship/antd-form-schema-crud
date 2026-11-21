import { App as AntdApp } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@jswork/antd-form-schema-crud/style.css';
import './api/posts';
import { PostsCreatePage, PostsDetailPage, PostsEditPage, PostsListPage } from './pages/posts';

function App() {
  return (
    <AntdApp>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/posts" element={<PostsListPage />} />
          <Route path="/posts/new" element={<PostsCreatePage />} />
          <Route path="/posts/:id" element={<PostsDetailPage />} />
          <Route path="/posts/:id/edit" element={<PostsEditPage />} />
        </Routes>
      </BrowserRouter>
    </AntdApp>
  );
}

export default App;
