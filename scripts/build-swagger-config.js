const fs = require('fs')
const path = require('path')

const STRUCTURE_BASE_DIR = './web'
const SWAGGER_CONFIG_FILE = './swagger-config.json'
const EXCLUDED_DIRS = new Set(['error'])

const getOpenApiPath = boundedContext => path.join(STRUCTURE_BASE_DIR, `${boundedContext}/openapi`)

const extractServices = (openapiPath, services) => {
  return services.reduce((servicesMap, service) => {
    servicesMap[service] = fs.readdirSync(`${openapiPath}/${service}`)
    return servicesMap
  }, {})
}

const buildStructure = () => {
  const boundedContexts = fs.readdirSync(STRUCTURE_BASE_DIR)

  return boundedContexts.reduce((boundContextMap, currentBoundContext) => {
    const openapiPath = getOpenApiPath(currentBoundContext)
    if (!fs.existsSync(openapiPath) || EXCLUDED_DIRS.has(currentBoundContext))
      return boundContextMap

    const services = fs.readdirSync(openapiPath)
    if (services.length === 0) return boundContextMap

    boundContextMap[currentBoundContext] = extractServices(openapiPath, services)

    return boundContextMap
  }, {})
}

const buildBoundedContextApiUrls = (structure, currentBoundContext) => {
  const services = Object.keys(structure[currentBoundContext])
  const openapiPath = getOpenApiPath(currentBoundContext)

  return services.reduce((boundedContextUrls, service) => {
    const serviceApiVersions = structure[currentBoundContext][service].map(version => ({
      url: `${openapiPath}/${service}/${version}`,
      name: `${currentBoundContext}/${service}/${version.replace('.yaml', '')}`
    }))

    return [...boundedContextUrls, ...serviceApiVersions]
  }, [])
}

const buildSwaggerConfig = () => {
  const structure = buildStructure()
  const urls = Object.keys(structure)
    .reduce((urls, currentBoundContext) => {
      const apiDefs = buildBoundedContextApiUrls(structure, currentBoundContext)

      return [...urls, ...apiDefs]
    }, [])

  /* Example:
    urls: [
      {
        "url": "web/petstore/openapi/petstore-service/v1.yaml",
        "name": "petstore/petstore-service/v1"
      }, ...
    ]
   */
  fs.writeFileSync(SWAGGER_CONFIG_FILE, JSON.stringify({ urls }, null, 2))
}

buildSwaggerConfig()
