// 通过yarn install 生成软链接 @vue/xxx(因为配置了workspace) 然后这里就可以引入
// ts.config.json 添加配置
// "moduleResolution": "node",
//     "baseUrl": ".",
//     "paths": {
//       // 引入@vue/*的某个文件的时候
//       "@vue/*": [
//         // 引入的就是这个
//         "packages/*/src"
//       ]
//     }
import { Shared } from '@vue/shared'
import ts from 'typescript'
const Reactivity = {}

export { Reactivity }
