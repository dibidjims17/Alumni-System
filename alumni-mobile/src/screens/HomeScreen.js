// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  Newspaper,
  CalendarDays,
  Bell,
  ChevronRight,
  CheckCheck,
  Moon,
  Sun,
  GraduationCap,
  LogOut,
  BriefcaseBusiness,
  BadgeCheck,
  Clock3,
  CircleAlert,
  Target,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../api/client';
import AppBackground from '../components/AppBackground';
import Skeleton from '../components/ui/Skeleton';
import { assetUrl } from '../utils/media';
import { alert as appAlert } from '../components/AppAlert';

const COMMUNITY_LINKS = [
  { key: 'news', label: 'News', sub: 'Updates & stories', Icon: Newspaper, target: ['CommunityTab', 'NewsList'] },
  { key: 'events', label: 'Events', sub: 'Reunions & fairs', Icon: CalendarDays, target: ['CommunityTab', 'EventsList'] },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// "Thursday, November 12, 2026" — CDM portal's page date line.
function todayLine() {
  try {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    const d = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

export default function HomeScreen({ navigation }) {
  const { student, logout } = useAuth();
  const { theme, isDark, toggleDarkMode } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  function confirmSignOut() {
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }
  const isGraduate = student?.schoolYear === 'Graduate';
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoaded, setUnreadLoaded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [careerRecord, setCareerRecord] = useState(null);
  const [careerLoaded, setCareerLoaded] = useState(!isGraduate);

  useFocusEffect(
    useCallback(() => {
      apiClient
        .get('/Notification/unread-count')
        .then((res) => setUnreadCount(res.data.count || 0))
        .catch(() => {})
        .finally(() => setUnreadLoaded(true));
      // Fresh photo every visit (updates right after a Profile change).
      apiClient
        .get('/Profile')
        .then((res) => setPhotoUrl(assetUrl(res.data?.profilePictureUrl)))
        .catch(() => setPhotoUrl(null));

      if (isGraduate) {
        apiClient
          .get('/Career/my-record')
          .then((res) => setCareerRecord(res.data || null))
          .catch(() => setCareerRecord(null))
          .finally(() => setCareerLoaded(true));
      }
    }, [isGraduate])
  );

  const firstName = (student?.fullName || 'Alumni').split(' ')[0];
  const initial = (student?.fullName || 'A').charAt(0).toUpperCase();
  const careerApproved = careerRecord?.status === 'Approved';
  const careerRejected = careerRecord?.status === 'Rejected';
  const careerPending = careerRecord?.status === 'Pending';
  const careerTitle = careerRecord
    ? [careerRecord.jobTitle, careerRecord.company].filter(Boolean).join(' at ') || careerRecord.employmentStatus
    : 'Add your employment status';
  const CareerStatusIcon = careerApproved ? BadgeCheck : careerRejected ? CircleAlert : careerPending ? Clock3 : BriefcaseBusiness;
  const careerStatusLabel = careerApproved ? 'Verified' : careerRejected ? 'Update required' : careerPending ? 'Under review' : 'Not submitted';
  const careerStatusColor = careerApproved ? c.success : careerRejected ? c.danger : careerPending ? c.warning : c.textMuted;
  const careerStatusBackground = careerApproved ? c.tintSuccess : careerRejected ? c.tintDanger : careerPending ? c.tintWarning : c.surfaceAlt;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      edges={['top', 'left', 'right']}
    >
      <AppBackground />
      <View
        style={[
          styles.headerFill,
          { backgroundColor: c.brandDeep, paddingTop: insets.top, marginTop: -insets.top },
        ]}
      >
        <View style={styles.header}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarPhoto} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: c.goldSoft }]}>
              <Text style={[styles.avatarText, { color: c.brandDeep }]}>{initial}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.greet, { color: 'rgba(255,255,255,0.72)' }]}>
              {greeting()},
            </Text>
            <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>
              {firstName}
            </Text>
            <Text style={[styles.detail, { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>
              {todayLine()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonGlass]}
              onPress={toggleDarkMode}
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={22} color="#FFFFFF" /> : <Moon size={22} color="#FFFFFF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonGlass]}
              onPress={() => navigation.navigate('HomeTab', { screen: 'Notifications' })}
              accessibilityLabel="Notifications"
            >
              <Bell size={22} color={c.gold} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: c.tintDanger }]}>
                  <Text style={[styles.badgeText, { color: c.danger }]}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Signature gold strip under the header (portal pattern). */}
        <View style={[styles.headerAccent, { backgroundColor: c.gold }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: c.brandDeep }]}>
          <View style={[styles.heroSun, { backgroundColor: c.gold }]} />
          <View style={[styles.heroGlowSmall, { backgroundColor: c.primaryTint }]} />
          <Text style={[styles.heroKicker, { color: c.gold, opacity: 1 }]}>
            A new day. Another step forward.
          </Text>
          {unreadLoaded ? (
            <>
              {/* Fixed white — hero bg is brandDeep in BOTH modes
                  (theme onPrimary is near-black in dark mode). */}
              <Text style={[styles.heroTitle, { color: '#FFFFFF' }]}>
                {unreadCount > 0
                  ? `${unreadCount} new notification${unreadCount === 1 ? '' : 's'}`
                  : "You're all caught up"}
              </Text>
              <Text style={[styles.heroSub, { color: '#FFFFFF' }]}>
                {unreadCount > 0
                  ? 'Application updates, jobs, and news waiting for you.'
                  : 'No new alerts. Your career and community updates are organized below.'}
              </Text>
              <TouchableOpacity
                style={[styles.heroButton, { backgroundColor: '#FFFFFF' }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Notifications')}
              >
                {unreadCount > 0 ? (
                  <Bell size={15} color="#104B38" />
                ) : (
                  <CheckCheck size={15} color="#104B38" />
                )}
                <Text style={[styles.heroButtonText, { color: '#104B38' }]}>
                  {unreadCount > 0 ? 'View notifications' : 'Review anyway'}
                </Text>
              </TouchableOpacity>
              {/* Glass chips — CDM dashboard hero (student no. · program · school year) */}
              <View style={styles.heroChips}>
                <View style={styles.chip}>
                  <Text style={[styles.chipText, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {student?.studentNumber || '—'}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={[styles.chipText, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {student?.program || '—'}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Clock3 size={12} color={c.gold} />
                  <Text style={[styles.chipText, { color: c.gold }]} numberOfLines={1}>
                    {student?.schoolYear || '—'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Skeleton width="70%" height={24} style={styles.heroSkeleton} />
              <Skeleton width="90%" height={14} style={styles.heroSkeleton} />
            </>
          )}
        </View>

        {/* Gold-edge stat tiles — CDM dashboard pattern */}
        <View style={styles.statRow}>
          <View
            style={[
              styles.statTile,
              { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.gold },
            ]}
          >
            <Text style={[styles.statLabel, { color: c.textMuted }]}>UNREAD ALERTS</Text>
            <Text style={[styles.statValue, { color: c.text }]}>
              {unreadLoaded ? (unreadCount > 99 ? '99+' : String(unreadCount)) : '—'}
            </Text>
            <Text style={[styles.statFoot, { color: c.textMuted }]} numberOfLines={1}>
              {unreadCount > 0 ? 'Waiting for you' : 'All caught up'}
            </Text>
          </View>
          <View
            style={[
              styles.statTile,
              { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.gold },
            ]}
          >
            <Text style={[styles.statLabel, { color: c.textMuted }]}>CAREER FILE</Text>
            <Text style={[styles.statValue, { color: c.text }]} numberOfLines={2}>
              {isGraduate ? (careerLoaded ? careerStatusLabel : '—') : student?.schoolYear || '—'}
            </Text>
            <Text style={[styles.statFoot, { color: c.textMuted }]} numberOfLines={1}>
              {isGraduate ? student?.schoolYear || '—' : 'Enrolled'}
            </Text>
          </View>
        </View>

        {isGraduate ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>CAREER SNAPSHOT</Text>
            <TouchableOpacity
              style={[styles.careerCard, { backgroundColor: c.surface, borderColor: c.border }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('CareerTab', { screen: 'CareerHome' })}
            >
              {!careerLoaded ? (
                <View style={{ flex: 1 }}>
                  <Skeleton width={100} height={22} borderRadius={999} style={{ marginBottom: 10 }} />
                  <Skeleton width="68%" height={17} style={{ marginBottom: 7 }} />
                  <Skeleton width="82%" height={12} />
                </View>
              ) : (
                <>
                  <View style={styles.careerCardTop}>
                    <View style={[styles.careerStatus, { backgroundColor: careerStatusBackground }]}>
                      <CareerStatusIcon size={13} color={careerStatusColor} />
                      <Text style={[styles.careerStatusText, { color: careerStatusColor }]}>
                        {careerStatusLabel}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={c.textMuted} />
                  </View>
                  <Text style={[styles.careerTitle, { color: c.text }]} numberOfLines={2}>
                    {careerTitle}
                  </Text>
                  <Text style={[styles.careerSub, { color: c.textMuted }]} numberOfLines={2}>
                    {careerRecord
                      ? [careerRecord.employmentStatus, careerRecord.industry].filter(Boolean).join(' · ')
                      : 'Open Career to add and verify your current path.'}
                  </Text>
                  {careerApproved && careerRecord?.courseAlignment ? (
                    <View style={[styles.alignmentPill, { backgroundColor: c.tintInfo }]}>
                      <Target size={12} color={c.info} />
                      <Text style={[styles.alignmentText, { color: c.info }]}>
                        {careerRecord.courseAlignment} with your program
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ACCOUNT STATUS</Text>
            <TouchableOpacity
              style={[styles.careerCard, { backgroundColor: c.surface, borderColor: c.border }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('YearTab', { screen: 'YearCorrection' })}
            >
              <View style={styles.correctionRow}>
                <View style={[styles.tileIcon, { backgroundColor: c.tintInfo }]}>
                  <GraduationCap size={22} color={c.info} />
                </View>
                <View style={styles.tileText}>
                  <Text style={[styles.tileLabel, { color: c.text }]}>Request year correction</Text>
                  <Text style={[styles.tileSub, { color: c.textMuted }]}>Career access opens after graduation</Text>
                </View>
                <ChevronRight size={17} color={c.textMuted} />
              </View>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.sectionLabel, styles.communityLabel, { color: c.textMuted }]}>COMMUNITY</Text>

        <View style={styles.linkList}>
          {COMMUNITY_LINKS.map(({ key, label, sub, Icon, target }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(target[0], { screen: target[1] })}
            >
              <View style={[styles.tileIcon, { backgroundColor: c.primaryTint }]}>
                <Icon size={22} color={c.primary} />
              </View>
              <View style={styles.tileText}>
                <Text style={[styles.tileLabel, { color: c.text }]}>{label}</Text>
                <Text style={[styles.tileSub, { color: c.textMuted }]} numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <ChevronRight size={16} color={c.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {!isGraduate && (
          <TouchableOpacity
            style={[styles.signOutRow, { borderColor: c.border }]}
            onPress={confirmSignOut}
            accessibilityLabel="Sign out"
          >
            <LogOut size={18} color={c.danger} />
            <Text style={[styles.signOutText, { color: c.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // No padding here — the green header must run full-bleed; horizontal
    // gutters live on the header bar and the scroll content instead.
  },
  headerFill: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerAccent: {
    height: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greet: {
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  detail: {
    fontSize: 12.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonGlass: {
    // Translucent pill on the green header (portal header buttons).
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  hero: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroSun: {
    // Gold sun-corner anchored at the top-right corner (CDM dashboard hero).
    // Center sits just outside the corner so text never lands on the gold.
    position: 'absolute',
    right: -70,
    top: -74,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.9,
  },
  heroGlowSmall: {
    position: 'absolute',
    right: 60,
    bottom: -70,
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.1,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
    opacity: 0.72,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.78,
  },
  heroSkeleton: {
    marginBottom: 8,
    borderRadius: 6,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14,
    gap: 6,
  },
  heroButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statTile: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    // Soft portal shadow — matches cards across the CDM inner pages.
    shadowColor: 'rgb(25, 61, 46)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statFoot: {
    fontSize: 11,
    marginTop: 3,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  communityLabel: { marginTop: 20 },
  careerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 15,
  },
  careerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  careerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  careerStatusText: { fontSize: 11.5, fontWeight: '700' },
  careerTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  careerSub: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  alignmentPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 11,
  },
  alignmentText: { fontSize: 11.5, fontWeight: '700' },
  correctionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  signOutText: { fontSize: 14, fontWeight: '700' },
  linkList: { gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tileSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
});
