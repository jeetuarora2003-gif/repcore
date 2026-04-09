import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/settings/', '/members/[memberId]'],
    },
    sitemap: 'https://repcore.app/sitemap.xml',
  }
}
