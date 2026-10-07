import { ComingSoon } from '@/components/ComingSoon';
import { useI18n } from '@/i18n';

// Phase placeholder, see mobile/README.md
export default function Tracker() {
	const { t } = useI18n();
	return <ComingSoon feature={t('tabs.tracker')} icon="pulse-outline" />;
}
