const RULES = [
    { match: [['восстановлен'], ['ssd']],                    image: '/services/восстановление данных ssd.jpg' },
    { match: [['восстановлен'], ['hdd']],                    image: '/services/восстановление данных hdd.jpg' },
    { match: [['диагност'], ['ноутбук']],                    image: '/services/диагностика ноутбука.jpg' },
    { match: [['диагност']],                                 image: '/services/диагностика пк.webp' },
    { match: [['блок'], ['питан']],                          image: '/services/замена блока питания.jpg' },
    { match: [['видеокарт']],                                image: '/services/замена видеокарты.jpg' },
    { match: [['клавиатур']],                                image: '/services/замена клавиатуры ноутбука.webp' },
    { match: [['материнск']],                                image: '/services/замена материнской платы.webp' },
    { match: [['матриц']],                                   image: '/services/замена матрицы ноутбука.webp' },
    { match: [['термопаст']],                                image: '/services/замена термопасты.jpg' },
    { match: [['разъём', 'разъем'], ['питан']],              image: '/services/ремонт разъема питания.webp' },
    { match: [['linux', 'линукс', 'ubuntu']],                image: '/services/установка linux.png' },
    { match: [['windows', 'виндовс']],                       image: '/services/установка windows.jpg' },
    { match: [['офис', 'office']],                           image: '/services/установка офисных программ.jpg' },
    { match: [['чистк'], ['пыл']],                           image: '/services/чистка от пыли.webp' },
];

function matchesRule(name, ruleGroups) {
    return ruleGroups.every(group =>
        group.some(word => name.includes(word))
    );
}

export function getServiceImage(service) {
    if (service?.image_url) return service.image_url;

    const name = (service?.service_name || '').toLowerCase();
    for (const rule of RULES) {
        if (matchesRule(name, rule.match)) {
            return rule.image;
        }
    }

    return null;
}