# antd-form-schema-crud
> Ant Design resource CRUD driven by antd-form-schema and show/create/update/destroy APIs.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![download][download-image]][download-url]

## installation
```shell
pnpm add @jswork/antd-form-schema-crud
```

## usage
  ```js
  import AntdFormSchemaCrud from '@jswork/antd-form-schema-crud';
  import '@jswork/antd-form-schema-crud/style.css';

  function App() {
    return (
      <div className="m-10 p-4 shadow bg-gray-100 text-gray-800 hover:shadow-md transition-all">
        <div className="badge badge-warning absolute right-0 top-0 m-4">
          Build Time: {BUILD_TIME}
        </div>
        <AntdFormSchemaCrud className="debug-red">
          abc
        </AntdFormSchemaCrud>
      </div>
    );
  }

  export default App;
  ```

## license
Code released under [the MIT license](https://github.com/afeiship/antd-form-schema-crud/blob/main/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/antd-form-schema-crud
[version-url]: https://npmjs.org/package/@jswork/antd-form-schema-crud

[license-image]: https://img.shields.io/npm/l/@jswork/antd-form-schema-crud
[license-url]: https://github.com/afeiship/antd-form-schema-crud/blob/main/LICENSE.txt

[download-image]: https://img.shields.io/npm/dm/@jswork/antd-form-schema-crud
[download-url]: https://www.npmjs.com/package/@jswork/antd-form-schema-crud
