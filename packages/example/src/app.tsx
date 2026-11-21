import { App as AntdApp } from 'antd';
import '@jswork/antd-form-schema-crud/style.css';
import { PostsPage } from './pages/posts';

function App() {
  return (
    <AntdApp>
      <PostsPage />
    </AntdApp>
  );
}

export default App;
