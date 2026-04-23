import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { MapPin, Phone, User, Package, Eye, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

// Cache route dynamically (optional, but good for updating products fast)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { id } = params;
    const org = await prisma.organization.findUnique({
        where: { id },
        select: { name: true, city: true, actualAddress: true }
    });
    
    if (!org) return { title: 'Оптика не найдена' };

    return {
        title: `Оптика ${org.name} | Каталог товаров`,
        description: `Онлайн-витрина оптики ${org.name}. ${org.actualAddress || org.city || ''}`,
    };
}

export default async function StorefrontPage({ params }: { params: { id: string } }) {
    const { id } = params;
    
    // Fetch organization and its public data
    const org = await prisma.organization.findUnique({
        where: { id },
        include: {
            users: {
                where: {
                    status: 'active',
                    OR: [
                        { role: 'doctor' },
                        { subRole: 'optic_doctor' }
                    ]
                },
                select: { id: true, fullName: true, avatar: true, subRole: true }
            },
            opticProducts: {
                where: { isPublic: true, isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
            }
        }
    });

    if (!org) {
        notFound();
    }

    const doctors = org.users;
    
    // Group products by category
    const productsByCategory = org.opticProducts.reduce((acc: any, p) => {
        const cat = p.type === 'service' ? 'Услуги клиники' :
                    p.category === 'frame' ? 'Оправы' :
                    p.category === 'sun_glasses' ? 'Солнцезащитные очки' :
                    p.category === 'contact_lens' ? 'Контактные линзы' :
                    p.category === 'spectacle_lens' ? 'Очковые линзы' :
                    p.category === 'solution' ? 'Растворы и капли' :
                    'Аксессуары';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header / Hero */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Оптика {org.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                            {(org.city || org.actualAddress) && (
                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                    <MapPin className="w-4 h-4 text-primary-500" />
                                    <span>{[org.city, org.actualAddress].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                            {(org.phone || org.contactPhone) && (
                                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                    <Phone className="w-4 h-4 text-primary-500" />
                                    <a href={`tel:${org.contactPhone || org.phone}`} className="hover:text-primary-600">
                                        {org.contactPhone || org.phone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-start sm:justify-end">
                         <div className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                             </span>
                             Онлайн-витрина
                         </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
                
                {/* Doctors Section */}
                {doctors.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-900">Наши специалисты</h2>
                        </div>
                        <div className="grid border border-gray-100 rounded-2xl bg-white overflow-hidden sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                            {doctors.map(doc => (
                                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                                        {doc.avatar ? (
                                            <Image src={doc.avatar} alt={doc.fullName} width={48} height={48} className="rounded-full object-cover w-full h-full" />
                                        ) : (
                                            doc.fullName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{doc.fullName}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Врач-офтальмолог</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Products Sections */}
                {Object.keys(productsByCategory).length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">В витрине пока пусто</h3>
                        <p className="text-sm text-gray-500">Приходите позже, оптика скоро наполнит свой каталог.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(productsByCategory).map(([categoryName, products]: [string, any]) => (
                            <div key={categoryName}>
                                <div className="flex items-center gap-2 mb-5">
                                    <h2 className="text-xl font-bold tracking-tight text-gray-900">{categoryName}</h2>
                                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{products.length}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {products.map((p: any) => (
                                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden flex flex-col group relative">
                                            {/* Optional Image block */}
                                            {p.images?.[0] ? (
                                                <div className="aspect-[4/3] w-full bg-gray-50 flex-shrink-0 bg-cover bg-center" style={{backgroundImage: `url(${p.images[0]})`}} />
                                            ) : (
                                                <div className="aspect-[4/3] w-full bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-300 group-hover:scale-105 transition-transform duration-500">
                                                    {p.type === 'service' ? <Eye className="w-10 h-10 stroke-[1.5]" /> : <Package className="w-10 h-10 stroke-[1.5]" />}
                                                </div>
                                            )}
                                            
                                            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                                {p.brand && <div className="text-[10px] sm:text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">{p.brand}</div>}
                                                <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{p.name}</h3>
                                                {p.shortDescription && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed hidden sm:block">{p.shortDescription}</p>
                                                )}
                                                
                                                <div className="mt-auto pt-3 flex items-end justify-between">
                                                    <div>
                                                        {p.retailPrice > 0 ? (
                                                            <div className="font-bold text-gray-900 text-base sm:text-lg tabular-nums">
                                                                {p.retailPrice.toLocaleString('ru-RU')} ₸
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs font-medium text-gray-400">Цена по запросу</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
            </div>
            
            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 mt-auto">
                <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
                    <p>Онлайн-витрина клиники «{org.name}»</p>
                    <p className="text-xs mt-1">Работает на платформе LensFlow.</p>
                </div>
            </footer>
        </div>
    );
}
