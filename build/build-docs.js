'use strict'

const glob = require("glob")
const fs = require('fs')
const yaml = require('js-yaml')
const path = require('path')
const _ = require('lodash')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const semver = require('semver')
const sortObj = require('sort-object')

rimraf.sync(path.resolve(__dirname, '../docs/zh-CN/demos'))
mkdirp.sync(path.resolve(__dirname, '../docs/zh-CN/demos'))
mkdirp.sync(path.resolve(__dirname, '../docs/zh-CN/changelog'))
mkdirp.sync(path.resolve(__dirname, '../docs/en/changelog'))

const aliasMap = {
  Base64Tool: 'base64',
  Md5Tool: 'md5',
  CookieTool: 'cookie',
  CommaTool: 'numberComma',
  PadTool: 'numberPad',
  RandomTool: 'numberRandom',
  FormatTool: 'dateFormat',
  TrimTool: 'stringTrim',
  QuerystringTool: 'querystring',
  DebounceTool: 'debounce',
  ThrottleTool: 'throttle'
}

let tMaps = {
  '组件列表': 'Components',
  '该组件已经停止维护。': 'This Component is Deprecated.',
  '名字': 'name',
  '类型': 'type',
  '参数': 'params',
  '默认': 'default',
  '说明': 'description',
  '该文件为自动生成，请不要修改': 'THIS FILE IS AUTOGENERATED, DONOT EDIT IT',
  '进入demo页面': 'Demo page',
  '编辑文档': 'Edit document',
  'demo源码': 'Demo source',
  '版本': 'version'
}

function getPath(dir) {
  return path.join(__dirname, dir)
}
let gComponents = []

let maps = {}
saveMaps('numberRange', 'src/tools/number/range.js')
saveMaps('dateRange', 'src/tools/date/range.js')
saveMaps('TransferDom', 'src/directives/transfer-dom/index.js')
saveMaps('trim', 'src/tools/string/trim')

function saveMaps(key, value) {
  if (key === 'RangeTool') {
    return
  }
  if (/vux/.test(value)) {
    let index = value.indexOf('src/components')
    if (/Filter$/.test(key)) {
      index = value.indexOf('src/filters')
    }
    if (/Data$/.test(key)) {
      index = value.indexOf('src/datas')
    }
    if (/Plugin$/.test(key)) {
      index = value.indexOf('src/plugins')
    }
    if (/Directive$/.test(key)) {
      index = value.indexOf('src/directives')
    }
    if (/Tool$/.test(key)) {
      index = value.indexOf('src/tools')
    }
    value = value.slice(index, value.length)
  }
  maps[key] = value.replace('../', '')
  if (aliasMap[key]) {
    maps[aliasMap[key]] = maps[key]
    delete maps[key]
  }
  // sort
  const list = []
  for (let i in maps) {
    list.push([i, maps[i]])
  }
  list.sort(function (a, b) {
    return a[0].toLowerCase() > b[0].toLowerCase() ? 1 : -1
  })
  list.unshift(['NOTICE', 'THIS FILE IS AUTOGENERATED BY npm run build-docs'])

  const _list = {}
  list.forEach(function (one) {
    _list[one[0]] = one[1]
  })
  fs.writeFileSync(getPath('../src/components/map.json'), JSON.stringify(_list, null, 2))
}

glob(getPath("../src/plugins/**/index.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Plugin', file)
  })
})

glob(getPath("../src/tools/**/*.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Tool', file)
  })
})

glob(getPath("../src/directives/**/index.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Directive', file)
  })
})

glob(getPath("../src/filters/*.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Filter', file)
  })
})

glob(getPath("../src/datas/*.json"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Data', file)
  })
})

glob(getPath("../src/components/**/*.vue"), {}, function (er, files) {
  // 生成组件路径映射
  // 语言配置
  let rs = {}
  let enRs = {}
  let zhCnRs = {}

  files.forEach(function (file) {

    let name = getComponentName(file)

    const importName = _camelCase(name)

    saveMaps(importName, file)

    let content = fs.readFileSync(file, 'utf-8')
    if (content.indexOf('</i18n>') > -1) {

      const name = getComponentName(file)

      const results = content.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/)
      const json = yaml.safeLoad(results[1])

      rs = Object.assign(rs, setKey(json, name))

      for (let i in json) {
        let enItem = {}
        enRs[i] = json[i].en
      }

      for (let i in json) {
        zhCnRs[i] = json[i]['zh-CN']
      }

    }

  })

  let dump = yaml.safeDump({
    en: enRs,
    'zh-CN': zhCnRs
  })
  dump = '# This file is built by build_locales.js, so don\'t try to modify it manually\n' + dump

  fs.writeFileSync(getPath('../src/locales/all.yml'), dump)
  fs.writeFileSync(getPath('../src/locales/en.yml'), yaml.safeDump(enRs))
  fs.writeFileSync(getPath('../src/locales/zh-CN.yml'), yaml.safeDump(zhCnRs))
})

function setKey(object, name) {
  for (let i in object) {
    object[`vux.${name}.${i}`] = object[i]
    delete object[i]
  }
  return object
}

glob(getPath('../src/**/metas.yml'), {}, function (err, files) {
  render(files)
  render(files, 'form')
  render(files, 'dialog')
  render(files, 'layout')
})

glob(getPath('../src/tools/**/metas.yml'), {}, function (err, files) {
  let rs = []
  files.forEach(function (file) {
    const name = file.split('tools/')[1].replace('/metas.yml', '')
    const json = yaml.safeLoad(fs.readFileSync(file, 'utf-8'))
    rs.push({
      name: name,
      metas: json
    })
  })
  fs.writeFileSync(getPath('../src/tools/changes.json'), JSON.stringify(rs, null, 2))
})

glob(getPath('../src/plugins/**/metas.yml'), {}, function (err, files) {
  let rs = []
  files.forEach(function (file) {
    const name = file.split('plugins/')[1].replace('/metas.yml', '')
    const json = yaml.safeLoad(fs.readFileSync(file, 'utf-8'))
    rs.push({
      name: name,
      metas: json
    })
  })
  fs.writeFileSync(getPath('../src/plugins/changes.json'), JSON.stringify(rs, null, 2))
})

glob(getPath('../src/directives/**/metas.yml'), {}, function (err, files) {
  let rs = []
  files.forEach(function (file) {
    const name = file.split('directives/')[1].replace('/metas.yml', '')
    const json = yaml.safeLoad(fs.readFileSync(file, 'utf-8'))
    rs.push({
      name: name,
      metas: json
    })
  })
  fs.writeFileSync(getPath('../src/directives/changes.json'), JSON.stringify(rs, null, 2))
})

function getComponentName(path) {
  let list = path.split('/')
  if (list[list.length - 1] === 'index.vue' || list[list.length - 1] === 'index.js') {
    return list[list.length - 2]
  } else if (list[list.length - 1] === 'metas.yml') {
    return list[list.length - 2]
  } else if (/\.json/.test(path)) {
    return list[list.length - 1].replace('.json', '')
  } else if (/\.js/.test(path)) {
    return list[list.length - 1].replace('.js', '')
  } else {
    return list[list.length - 1].replace('.vue', '')
  }
}

function render(files, tag) {
  let components = []
  let infos = []

  files.forEach(function (file) {

    const name = getComponentName(file)
    const content = fs.readFileSync(file, 'utf-8')
    const json = yaml.safeLoad(content)
    let rs = {
      name: name,
      importName: _camelCase(name),
      deprecatedInfo: json.deprecated_info || '',
      props: json.props,
      events: json.events,
      methods: json.methods,
      slots: json.slots,
      extra: json.extra,
      after_extra: json.after_extra,
      tags: json.tags,
      items: json.items,
      json: json
    }

    let item = {
      name: name,
      icon: json.icon,
      color: json.color,
      importName: json.importName,
      items: json.items
    }

    if (!tag && item.icon && item.name) {
      gComponents.push(item)
    }

    if (json.icon) {
      infos.push({
        name,
        icon: json.icon,
        importName: json.importName,
        metas: json
      })
    }

    if (tag && json.tags && json.tags.en && json.tags.en.indexOf(tag) === -1) {
      return
    }
    if (tag && json.tags && !json.tags.en) {
      return
    }
    if (tag && !json.tags) {
      return
    }

    if (json.icon) {
      rs.icon = json.icon
    }
    if (json.color) {
      rs.color = json.color
    }
    if (json.import_code) {
      rs.import_code = json.import_code
    }
    rs.status = json.status || 'maintaining'
    if (rs.icon && rs.name) {
      components.push(rs)
    } else {}

  })
  if (!tag) {
    gComponents = _.uniqBy(gComponents, 'name')
    fs.writeFileSync(getPath('../src/datas/vux_component_list.json'), JSON.stringify(gComponents, null, 2))
  }

  buildChanges(infos)
  buildChanges(infos, 'en')

  buildDemos(infos)

  let langs = ['zh-CN', 'en']
  for (var i = 0; i < langs.length; i++) {
    let lang = langs[i]
    let docs = ''
    if (!tag) {
      // 生成docs
      docs += `---
nav: ${lang}
---
<!--${t('该文件为自动生成，请不要修改')}-->
  \n## ${t('组件列表')}`
    } else {
      // 生成docs
      docs += `---
nav: ${lang}
---
<!--${t('该文件为自动生成，请不要修改')}-->
  \n## ${tag}`
    }

    components.forEach(function (one) {
      docs += '\n\n---\n'
      docs += `\n### ${one.importName}_COM`

      docs += `\n<span style="color: #999;font-size:12px;"><a href="https://github.com/airyland/vux/blob/v2/src/components/${one.name}/metas.yml" target="_blank">${t('编辑文档', lang)}</a></span>`
      docs += `\n&nbsp;&nbsp;<span style="color: #999;font-size:12px;"><a href="#" router-link="/zh-CN/demos/${(one.name || name).replace('-item', '')}">${t("进入demo页面", lang)}</a></span>`
      docs += `\n&nbsp;&nbsp;<span style="color: #999;font-size:12px;"><a href="https://vux.li/demos/v2/#/component/${one.name}" target="_blank">${t("demo 原始链接", lang)}</a></span>`
      docs += `\n&nbsp;&nbsp;<span style="color: #999;font-size:12px;"><a href="https://github.com/airyland/vux/blob/v2/src/demos/${one.importName}.vue" target="_blank">${t("demo源码", lang)}</a></span>\n`

      if (one.status === 'deprecated') {
        docs += `\n<p class="warning">${t('该组件已经停止维护。')}${one.deprecatedInfo ? one.deprecatedInfo[lang] : ''}</p>\n`
      }

      if (one.import_code) {
        if (one.import_code !== '&nbsp;') {
          docs += '\n``` js'
          docs += `\n${one.import_code}`
          docs += '\n```\n'
        }
      } else {
        docs += '\n``` js'
        docs += `\nimport { ${one.importName} } from 'vux'`
        docs += '\n```\n'
      }

      if (one.extra && typeof one.extra === 'string' && lang === 'zh-CN') {
        docs += '\n' + one.extra + '\n'
      }
      if (one.extra && typeof one.extra === 'object' && one.extra[lang]) {
        docs += '\n' + one.extra[lang] + '\n'
      }

      if (one.props || one.slots) {
        docs = getComponentInfo(one, lang, docs)
      }

      if (one.items) {

        docs = getComponentInfo({
          name: one.name,
          hideDemo: one.items.length > 1,
          props: one.json[one.items[0]].props,
          sub_extra: one.json[one.items[0]].sub_extra,
          slots: one.json[one.items[0]].slots,
          events: one.json[one.items[0]].events,
          methods: one.json[one.items[0]].methods
        }, lang, docs, one.items[0])

        docs = getComponentInfo({
          name: one.name,
          json: one.json,
          hideDemo: one.items.length > 2,
          props: one.json[one.items[1]].props,
          sub_extra: one.json[one.items[1]].sub_extra,
          slots: one.json[one.items[1]].slots,
          events: one.json[one.items[1]].events,
          methods: one.json[one.items[1]].methods
        }, lang, docs, one.items[1])

        if (one.items.length === 3) {
          docs = getComponentInfo({
            name: one.name,
            json: one.json,
            props: one.json[one.items[2]].props,
            sub_extra: one.json[one.items[2]].sub_extra,
            slots: one.json[one.items[2]].slots,
            events: one.json[one.items[2]].events,
            methods: one.json[one.items[2]].methods
          }, lang, docs, one.items[2])
        }
      }

      // after extra
      if (one.after_extra) {
        docs += '\n' + (one.after_extra[lang] || one.after_extra) + '\n'
      }
      /**
        docs += `\n<div id="play-${one.importName}" class="component-play-box">
      Playground is coming soon
    </div>\n`
    */
      docs += `\n\n\n`
    })

    if (!tag) {
      fs.writeFileSync(getPath(`../docs/${lang}/components.md`), docs)

    } else {
      fs.writeFileSync(getPath(`../docs/${lang}/components_${tag}.md`), docs)

    }
  }

}

glob(getPath("../src/styles/*.yml"), {}, function (er, files) {
  mkdirp.sync(path.resolve(__dirname, '../docs/zh-CN/css'))

  files.forEach(function (file) {
    const content = fs.readFileSync(file, 'utf-8')
    const info = yaml.safeLoad(content)

    let docs = ``
    docs += `## ${info.name.en}\n`
    docs += `${info.doc}\n\n`
    fs.writeFileSync(getPath(`../docs/zh-CN/css/${info.name.en}.md`), docs)
  })
})


function getVersion(version) {
  let rs = ''
  if (!version) {
    rs = ''
  } else if (version === 'next') {
    rs = '下个版本'
  } else {
    rs = version
  }
  return `<span style="font-size:12px;white-space:nowrap;">${rs}</span>`
}

function getComponentInfo(one, lang, docs, name) {
  if (one.props || one.slots) {
    if (name) {
      docs += `\n<span class="vux-component-name">${_camelCase(name)}</span>\n`
    }
  }
  if (one.sub_extra) {
    docs += `\n${one.sub_extra}\n`
  }
  if (one.props) {
    // prop title
    docs += `\n<span class="vux-props-title">Props</span>\n`
    docs += `\n| ${t('名字')}   | ${t('类型')} | ${t('默认')}  |  version | ${t('说明')}   |
|-------|-------|-------|-------|-------|
`
    for (let i in one.props) {
      let prop = one.props[i][lang]
      docs += `| ${getKeyHTML(i)} | ${getTypeHTML(one.props[i].type)} | ${getColorHTML(one.props[i])} | ${getVersion(one.props[i].version)} | ${prop} |\n`
    }
  }

  if (one.slots) {
    // slot title
    docs += `\n<span class="vux-props-title">Slots</span>\n`
    docs += `\n| ${t('名字')}    | ${t('说明')}   |  ${t('版本')} |
|-------|-------|-------|
`
    for (let i in one.slots) {
      let slot = one.slots[i][lang]
      docs += `| ${getKeyHTML(i)} | ${slot} | ${getVersion(one.slots[i].version)} |\n`
    }
  }

  if (one.events) {
    // slot title
    docs += `\n<span class="vux-props-title">Events</span>\n`
    docs += `\n| ${t('名字')}    | ${t('参数')}   | ${t('说明')} |
|-------|-------|-------|
`
    for (let i in one.events) {
      let intro = one.events[i][lang]
      let params = one.events[i]['params']
      docs += `| ${getKeyHTML(i)} |   ${params || '&nbsp;'} | ${intro} |\n`
    }
  }

  if (one.methods) {
    // slot title
    docs += `\n<span class="vux-props-title">Methods</span>\n`
    docs += `\n| ${t('名字')}    | ${t('参数')}   | ${t('说明')} | ${t('版本')} |
|-------|-------|-------|-------|
`
    for (let i in one.methods) {
      let intro = one.methods[i][lang]
      let params = one.methods[i]['params']
      docs += `| ${getKeyHTML(i)} |   ${params || '&nbsp;'} | ${intro} |${getVersion(one.methods[i].version)} | \n`
    }
  }

  // docs += `<div></div>`
  // docs += `\n`
  // docs += `\n\n<span class="vux-props-title">Demo</span>\n`
  // docs += `\n<div id="play-${one.importName}" class="component-play-box"><a class="vux-demo-link" href="#" router-link="/zh-CN/demos/${one.name}">进入demo页面</a></div>\n`
  docs += `\n`
    // docs += `\n\n<span class="vux-props-title">Demo</span>\n`

  if (one.name || name) {
    if (one.hideDemo !== true) {
      docs += `\n<a class="vux-demo-link" href="#" router-link="/zh-CN/demos/${(one.name || name).replace('-item', '')}">${t("进入demo页面")}</a>\n`
    }
  }

  // do not show change log in component list
  if (one.json && one.json.changes && one.hideDemo !== true && false) {
    let lastestVersion = Object.keys(one.json.changes)[0]
    docs += `\n<br><span class="vux-props-title">Changes (${lastestVersion})</span>\n`

    docs += `<ul>`
    one.json.changes[lastestVersion]['zh-CN'].forEach(one => {
      docs += `${getChangeTagHTML(one, '14px')}`
    })
    docs += `</ul>\n`
  }
  return docs
}

function getKeyHTML(key) {
  return `<span class="prop-key" style="white-space:nowrap;">${key}</span>`
}



function getChangeTagHTML(str, fontSize = '15px') {
  const _split = str.split(']')
  const type = _split[0].replace('[', '')
  const content = _split[1]
  return `<li><span style="font-size:${fontSize};"><span class="change change-${type}">${type}</span> ${content}</span></li>`
}

function getColorHTML(one) {
  one.default = typeof one.default === 'undefined' ? '' : one.default
  let value = one.default
  if (value === false) {
    return 'false'
  }
  if (!/#/.test(value)) {
    return value
  } else {
    return `<span class="type" style="width:65px;background-color:${value}">${value}</span>`
  }
}

function t(key, lang) {
  if (lang === 'zh-CN') {
    return key
  }
  return tMaps[key] || key
}
/**
function transform (object, name) {
  let rs = {
    en: {},
    'zh-CN': {}
  }
  for(let i in object) {
    rs['en'][`vux.${name}.${i}`] = object[i]['en']
    rs['zh-CN'][`vux.${name}.${i}`] = object[i]['zh-CN']
  }
  return rs
}
**/

function camelCase(input) {
  let str = input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });

  str = str.replace(/_(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
  return str
}

function _camelCase(input) {
  let str = camelCase(input)
  return str.slice(0, 1).toUpperCase() + str.slice(1)
}

function buildDemos(infos) {
  infos.forEach((one) => {
    let str = ''
    let url = `https://vux.li/demos/v2/#/component/${one.name}`
    str += `---
nav: zh-CN
---


### ${_camelCase(one.name)}_COM

<img width="100" src="http://qr.topscan.com/api.php?text=${encodeURIComponent(url)}"/>

<a href="${url}" target="_blank" style="font-size:12px;color:#888;">demo 原始链接：${url}</a>

`

if (one.metas.references) {
        str += `\n#### 交互&设计参考`
        if (one.metas.references['zh-CN']) {
          const cnList = one.metas.references['zh-CN']
          cnList.forEach((item) => {
            str += `\n- [${item.title}](${item.link})`
          })
        }
      }

str += `

---

#### 演示

 <div style="width:377px;height:667px;display:inline-block;border:1px dashed #ececec;border-radius:5px;overflow:hidden;">
   <iframe src="${url}" width="375" height="667" border="0" frameborder="0"></iframe>
 </div>
`

    try {
      str += `\n#### demo 代码\n`

      str += `
<p class="tip">下面的$t是Demo的i18n使用的翻译函数，一般情况下可以直接使用字符串。另外，下面代码隐藏了i18n标签部分的代码。</p>
`

      str += '\n``` html\n'

      let code = fs.readFileSync(getPath(`../src/demos/${_camelCase(one.name)}.vue`), 'utf-8')
      str += `${code.replace(/<i18n[^>]*>([\s\S]*?)<\/i18n>/g, '')}\n`
      str += '```\n'


      str += `

#### Github Issue`

      fs.writeFileSync(getPath(`../docs/zh-CN/demos/${one.name}.md`), str)

    } catch (e) {
      console.log(e)
    }

  })
}

function parseChange(str) {
  str = str.replace(/#(\d+)\s?/g, function (a, b) {
    return `<a href="https://github.com/airyland/vux/issues/${b}" target="_blank">#${b}</a> `
  })
  str = str.replace(/@(\w+)\s?/g, function (a, b) {
    return `<a href="https://github.com/${b}" target="_blank">${a}</a>`
  })
  return str
}

function parseTag(firstTag, tag) {
  if (tag === 'next') {
    return `${tag} (暂未发布)`
  }
  return tag
}

function buildChanges(infos, lang = 'zh-CN') {

  const toolInfos = require(getPath('../src/tools/changes.json'))
  const pluginInfos = require(getPath('../src/plugins/changes.json'))
  const directiveInfos = require(getPath('../src/directives/changes.json'))

  infos = infos.concat(toolInfos)
  infos = infos.concat(pluginInfos)
  infos = infos.concat(directiveInfos)
  let rs = {}
  infos.forEach(one => {
    let name = one.name
    let metas = one.metas
    if (metas && metas.changes) {
      for (let i in metas.changes) {
        if (!rs[i]) {
          rs[i] = {}
        }
        rs[i][name] = metas.changes[i][lang]
      }
    }
  })
  let str = `---
title: VUX 更新日志
---\n

# VUX 更新日志`

  rs = sortObj(rs, {
    sort: function (a, b) {
      if (a === 'next') {
        return -1
      }
      if (b === 'next') {
        return 1
      }
      return semver.gt(a, b) ? -1 : 1
    }
  })

  let firstTag = Object.keys(rs)[0]
  let releases = {}

  for (let i in rs) {
    releases[i] = {}
      // releases += `\n # ${i}\n`
    str += `\n## ${parseTag(firstTag, i)}\n`
    for (let j in rs[i]) {
      // releases += `\n## ${_camelCase(j)}\n`
      releases[i][j] = []
      str += `\n### ${_camelCase(j)}\n`
      str += `<ul>`
      rs[i][j] && rs[i][j].forEach(one => {
        str += `${parseChange(getChangeTagHTML(one))}`
          // releases += `- ${one}\n`
        releases[i][j].push(one)
      })
      str += `</ul>`
      str += `\n`
    }
  }

  for (let i in releases) {
    const release = releases[i]
    let file = getPath(`../docs/${lang}/changelog/${i}.md`)

    let data = {
      lang: lang,
      version: i,
      title: `${i}发布`,
      components: []
    }
    let title = ''
    if (i === 'next') {
      title = 'next 即将发布'
    } else {
      title = `${i} 发布`
    }
    let content = `
---
title: VUX ${title}
---

# ${title}
`
    for (let j in release) {
      content += `\n## ${_camelCase(j)}\n`
      release[j].forEach(function (line) {
        content += `- ${line}\n`
      })
      data.components.push({
        name: j,
        list: release[j].map(one => {
          return {
            change: one
          }
        })
      })
      fs.writeFileSync(file, content)
    }
  }

  str += '\n'

  fs.writeFileSync(getPath(`../docs/${lang}/changelog/changelog.md`), str)
}

function getTypeHTML(type) {
  type = type || 'String'
  if (/,/.test(type)) {
    const list = type.split(',').map(function (one) {
      return one.replace(/^\s+|\s+$/g, '')
    }).map(function (one) {
      return `<span class="type type-${one ? one.toLowerCase() : 'string'}">${one}</span>`
    })
    return list.join('<br>')
  } else {
    return `<span class="type type-${type ? type.toLowerCase() : 'string'}">${type}</span>`
  }
}