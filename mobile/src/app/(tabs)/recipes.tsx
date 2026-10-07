import { ComingSoon } from '@/components/ComingSoon';
import { useI18n } from '@/i18n';

// Phase placeholder, see mobile/README.md
export default function Recipes() {
	const { t } = useI18n();
	return <ComingSoon feature={t('tabs.recipes')} icon="book-outline" />;
}
