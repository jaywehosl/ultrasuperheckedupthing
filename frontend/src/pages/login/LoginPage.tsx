import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfigProvider,
  Form,
  Input,
  Layout,
  Menu,
  Popover,
  Space,
  Spin,
  message,
} from 'antd';
import {
  KeyOutlined,
  LockOutlined,
  MoonOutlined,
  SunOutlined,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { HttpUtil, LanguageManager } from '@/utils';
import { antdRule } from '@/utils/zodForm';
import { setMessageInstance } from '@/utils/messageBus';
import { pauseAnimationsUntilLeave, useTheme } from '@/hooks/useTheme';
import { LoginFormSchema, TwoFactorCodeSchema, type LoginFormValues } from '@/schemas/login';
import './LoginPage.css';
import ParticleField from '@/components/ui/ParticleField';

const HEADLINE_INTERVAL_MS = 2000;

type LoginForm = LoginFormValues;

const basePath = window.X_UI_BASE_PATH || '';

export default function LoginPage() {
  const { t } = useTranslation();
  const { isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig } = useTheme();
  const [messageApi, messageContextHolder] = message.useMessage();

  useEffect(() => {
    setMessageInstance(messageApi);
  }, [messageApi]);

  const [fetched, setFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorEnable, setTwoFactorEnable] = useState(false);
  const [lang, setLang] = useState<string>(() => LanguageManager.getLanguage());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const msg = await HttpUtil.post('/getTwoFactorEnable');
      if (cancelled) return;
      if (msg.success) setTwoFactorEnable(!!msg.obj);
      setFetched(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const onSubmit = useCallback(async (values: LoginForm) => {
    setSubmitting(true);
    try {
      const msg = await HttpUtil.post('/login', values);
      if (msg.success) window.location.href = basePath + 'panel/';
    } finally {
      setSubmitting(false);
    }
  }, []);

  const onLangChange = useCallback((next: string) => {
    setLang(next);
    LanguageManager.setLanguage(next);
  }, []);

  const cycleTheme = useCallback(() => {
    pauseAnimationsUntilLeave('login-theme-cycle');
    toggleTheme();
  }, [toggleTheme]);

  const pageClass = useMemo(() => {
    const classes = ['login-app'];
    if (isDark) classes.push('is-dark');
    if (isUltra) classes.push('is-ultra');
    return classes.join(' ');
  }, [isDark, isUltra]);

  const langMenuItems = useMemo(
    () => (LanguageManager.supportedLanguages as { value: string; name: string; icon: string }[]).map((l) => ({
      key: l.value,
      label: (
        <Space size={8}>
          <span aria-hidden="true">{l.icon}</span>
          <span>{l.name}</span>
        </Space>
      ),
    })),
    [],
  );

  const themeIcon = isDark ? <MoonOutlined /> : <SunOutlined />;

  return (
    <ConfigProvider theme={antdThemeConfig}>
      {messageContextHolder}
      <Layout className={pageClass}>
        <ParticleField
          className="kinetic-canvas"
          additive={isDark}
          intensity={isDark ? 1.7 : 0.95}
          interactive
        />
        <Layout.Content className="login-content">
          <div className="login-header">
            <div className="brand-block">
              <svg className="antigravity-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24, marginRight: 8 }}>
                <path d="M12 2L2 22h20L12 2z" fill="#3279F9" />
                <path d="M12 6l7 13H5l7-13z" fill="#FFFFFF" opacity="0.3" />
              </svg>
              <span className="brand-text">3X-UI Antigravity</span>
            </div>
            <div className="login-header-right">
              <Button
                id="login-theme-cycle"
                shape="circle"
                size="large"
                className="toolbar-btn"
                aria-label={t('menu.theme')}
                title={t('menu.theme')}
                icon={themeIcon}
                onClick={cycleTheme}
              />
              <Popover
                rootClassName={isDark ? 'dark' : 'light'}
                placement="bottomRight"
                trigger="click"
                styles={{ content: { padding: 4 } }}
                content={
                  <Menu
                    mode="vertical"
                    selectable
                    selectedKeys={[lang]}
                    items={langMenuItems}
                    onClick={({ key }) => onLangChange(key)}
                    style={{ border: 'none', minWidth: 160 }}
                  />
                }
              >
                <Button
                  shape="circle"
                  size="large"
                  className="toolbar-btn"
                  aria-label={t('pages.settings.language')}
                  icon={<TranslationOutlined />}
                />
              </Popover>
            </div>
          </div>

          <div className="login-hero-container">
            <h1 className="login-hero-title">
              Experience liftoff with next-gen connection management
            </h1>
            <p className="login-hero-subtitle">
              A clean, spacious, and high-performance panel powered by Xray-core.
            </p>
          </div>

          <div className="login-wrapper">
            {!fetched ? (
              <div className="login-loading">
                <Spin size="large" />
              </div>
            ) : (
              <div className="login-card">
                <Form
                  layout="vertical"
                  className="login-form"
                  onFinish={onSubmit}
                  initialValues={{ username: '', password: '', twoFactorCode: '' }}
                >
                  <Form.Item
                    label={t('username')}
                    name="username"
                    rules={[antdRule(LoginFormSchema.shape.username, t)]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: '#3279F9' }} />}
                      autoComplete="username"
                      size="large"
                      placeholder={t('username')}
                      autoFocus
                    />
                  </Form.Item>

                  <Form.Item
                    label={t('password')}
                    name="password"
                    rules={[antdRule(LoginFormSchema.shape.password, t)]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#3279F9' }} />}
                      autoComplete="current-password"
                      size="large"
                      placeholder={t('password')}
                    />
                  </Form.Item>

                  {twoFactorEnable && (
                    <Form.Item
                      label={t('twoFactorCode')}
                      name="twoFactorCode"
                      rules={[antdRule(TwoFactorCodeSchema, t)]}
                    >
                      <Input
                        prefix={<KeyOutlined style={{ color: '#3279F9' }} />}
                        autoComplete="one-time-code"
                        size="large"
                        placeholder={t('twoFactorCode')}
                      />
                    </Form.Item>
                  )}

                  <Form.Item className="submit-row">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      size="large"
                      block
                      className="login-submit-btn"
                    >
                      {t('login')}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}
