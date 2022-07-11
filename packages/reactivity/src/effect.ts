import { isArray, isIntegerKey } from '../../shared/src/index'
import { TriggerOrType } from './operators'
export function effect(fn, options: any = {}) {
  // 需要让这个effect变成响应的effect，可以做到数据变化重新执行

  const effect = createReactiveEffect(fn, options)

  if (!options.lazy) {
    effect() //响应式effect默认先执行一次
  }

  return effect
}

let uid = 0
let activeEffect // 当前正在运行的effect
const effectStack = []

// fn effect的回调函数
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effectStack.includes(effect)) {
      //保证effect没有加入到effectStack,避免出现 xxx++ 导致死循环
      try {
        effectStack.push(effect)
        activeEffect = effect
        return fn() // 函数执行会取值，取值就会走Get
      } finally {
        effectStack.pop()
        // 让activeEffect的指向永远正确(处理出现嵌套effect函数的场景)
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.id = uid++ //标识 区分effect
  effect._isEffect = true // 标识响应式
  effect.raw = fn // 保留对应的原函数
  effect.options = options
  return effect
}

// 让某个对象中的属性 收集当前他对应的 effect 函数
const targetMap = new WeakMap()
export function track(target, type, key) {
  // 结构 外层weakMap收集整体对象，内层 map 收集对象里面某个属性的effect函数
  // weakMap:
  // key => {name: 'zz', age: 18},
  // value(map) => { name => Set[effect1,effect2], age => Set[effect1,effect2]}
  // value 对应的是一个 map，这个map里面的 value 对应一个set
  if (activeEffect === undefined) {
    return
  }
  // 获取外层
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    // 不存在
    targetMap.set(target, (depsMap = new Map()))
  }
  // 获取某一个属性
  let dep = depsMap.get(key)
  if (!dep) {
    // 不存在
    depsMap.set(key, (dep = new Set()))
  }
  // 当前方法没有被收集的话 存起来
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
  }
  console.log(targetMap)
}

export function trigger(target, type, key?, newValue?, oldValue?) {
  console.log(target, type, key, newValue, oldValue)

  // 如果这个属性没收集过 effects ，那不需要做任何操作
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // 将所有要执行的effect 全都存在一个新的集合，最终一起执行
  const effects = new Set()

  const add = (effectsToAdd) => {
    // 遍历 Set[effects] 将所有effect收集起来
    if (effectsToAdd) {
      effectsToAdd.forEach((effect) => effects.add(effect))
    }
  }
  // 1. 看修改的是不是数组长度 因为改长度影响比较大
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key > newValue) {
        // 1. 如果更改的是长度那么长度对应的Set[effect] 要更新
        // 2. 或者 key 小于 length新值 那么这个索引对应的effect也要更新
        // Array.length = 1  arr[2] = 1
        // 2 > 1 ，所以 2对应的索引的effect 函数也要更新
        add(dep)
      }
    })
  } else {
    // 可能是对象
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    // 如果是修改数组中的 某一个索引 arr[1000] = 1000 ？那么更新索引1000对应的effect和length对应的effect
    // 如果添加了一个索引，那么就触发长度的更新，这里有点 hack 的意思了，前面堵不住，在这再处理一次
    switch (type) {
      case TriggerOrType.ADD:
        // 如果修改的是数组 同时是索引，那么length也要更新
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get('length'))
        }
        break

      default:
        break
    }
  }
  effects.forEach((effect: any) => effect())
}
