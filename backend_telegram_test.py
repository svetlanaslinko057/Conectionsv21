#!/usr/bin/env python3
"""
Phase 2.3: Telegram Alerts Delivery Testing
Tests all Telegram notification endpoints and functionality.
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any

# Use production URL from frontend .env
BACKEND_URL = "https://svetlana-connect.preview.emergentagent.com"

class TelegramNotificationsTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        self.session.timeout = 30
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_test(self, name: str, test_func, expected_result: Any = True) -> bool:
        """Run a single test and track results"""
        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            result = test_func()
            if result == expected_result or (expected_result is True and result):
                self.tests_passed += 1
                self.log(f"✅ PASSED: {name}", "SUCCESS")
                return True
            else:
                self.failed_tests.append(f"{name}: Expected {expected_result}, got {result}")
                self.log(f"❌ FAILED: {name} - Expected {expected_result}, got {result}", "ERROR")
                return False
        except Exception as e:
            self.failed_tests.append(f"{name}: Exception - {str(e)}")
            self.log(f"❌ FAILED: {name} - Exception: {str(e)}", "ERROR")
            return False
    
    def admin_login(self) -> bool:
        """Login as admin and store token"""
        try:
            login_data = {
                "username": "admin",
                "password": "admin12345"
            }
            response = self.session.post(
                f"{self.base_url}/api/admin/auth/login",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'token' in data:
                    self.admin_token = data['token']
                    self.log(f"Admin login successful, token: {self.admin_token[:20]}...")
                    return True
            
            self.log(f"Admin login failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Admin login exception: {e}")
            return False
    
    def test_telegram_settings_get(self) -> bool:
        """Test GET /api/admin/connections/telegram/settings"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/telegram/settings",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    settings = data['data']
                    # Check for required settings fields
                    required_fields = ['enabled', 'preview_only', 'chat_id', 'cooldown_hours', 'type_enabled']
                    has_all_fields = all(field in settings for field in required_fields)
                    
                    if has_all_fields:
                        self.log(f"Settings structure: enabled={settings.get('enabled')}, preview_only={settings.get('preview_only')}")
                        return True
                    else:
                        self.log(f"Missing required fields in settings: {settings.keys()}")
                        return False
            
            self.log(f"Settings GET failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Settings GET test failed: {e}")
            return False
    
    def test_telegram_settings_patch(self) -> bool:
        """Test PATCH /api/admin/connections/telegram/settings"""
        if not self.admin_token:
            return False
        
        try:
            # First get current settings
            get_response = self.session.get(
                f"{self.base_url}/api/admin/connections/telegram/settings",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if get_response.status_code != 200:
                self.log("Could not get current settings for PATCH test")
                return False
            
            current_settings = get_response.json()['data']
            original_enabled = current_settings.get('enabled', False)
            
            # Test patching enabled field
            patch_data = {'enabled': not original_enabled}
            
            response = self.session.patch(
                f"{self.base_url}/api/admin/connections/telegram/settings",
                json=patch_data,
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    updated_settings = data['data']
                    new_enabled = updated_settings.get('enabled')
                    
                    # Verify the change was applied
                    if new_enabled == (not original_enabled):
                        self.log(f"Settings PATCH successful: enabled changed from {original_enabled} to {new_enabled}")
                        
                        # Restore original setting
                        restore_response = self.session.patch(
                            f"{self.base_url}/api/admin/connections/telegram/settings",
                            json={'enabled': original_enabled},
                            headers={
                                'Authorization': f'Bearer {self.admin_token}',
                                'Content-Type': 'application/json'
                            }
                        )
                        
                        return True
                    else:
                        self.log(f"Settings not updated correctly: expected {not original_enabled}, got {new_enabled}")
                        return False
            
            self.log(f"Settings PATCH failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Settings PATCH test failed: {e}")
            return False
    
    def test_telegram_stats_get(self) -> bool:
        """Test GET /api/admin/connections/telegram/stats"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/telegram/stats?hours=24",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    stats = data['data']
                    # Check for expected stats fields
                    expected_fields = ['total', 'sent', 'skipped', 'failed']
                    has_stats_fields = all(field in stats for field in expected_fields)
                    
                    if has_stats_fields:
                        self.log(f"Stats: total={stats.get('total')}, sent={stats.get('sent')}, skipped={stats.get('skipped')}, failed={stats.get('failed')}")
                        return True
                    else:
                        self.log(f"Missing expected stats fields: {stats.keys()}")
                        return False
            
            self.log(f"Stats GET failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Stats GET test failed: {e}")
            return False
    
    def test_telegram_history_get(self) -> bool:
        """Test GET /api/admin/connections/telegram/history"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/telegram/history?limit=20",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    history = data['data']
                    # History should be a list (can be empty)
                    if isinstance(history, list):
                        self.log(f"History retrieved: {len(history)} entries")
                        
                        # If there are entries, check structure
                        if len(history) > 0:
                            first_entry = history[0]
                            expected_fields = ['id', 'type', 'created_at', 'delivery_status']
                            has_entry_fields = all(field in first_entry for field in expected_fields)
                            
                            if not has_entry_fields:
                                self.log(f"History entry missing fields: {first_entry.keys()}")
                                return False
                        
                        return True
                    else:
                        self.log(f"History data is not a list: {type(history)}")
                        return False
            
            self.log(f"History GET failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"History GET test failed: {e}")
            return False
    
    def test_telegram_test_message_endpoint(self) -> bool:
        """Test POST /api/admin/connections/telegram/test (should fail gracefully without proper config)"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/admin/connections/telegram/test",
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                },
                json={}
            )
            
            # This endpoint should return either success (if configured) or a proper error message
            if response.status_code in [200, 400]:
                data = response.json()
                if 'ok' in data:
                    if data['ok']:
                        self.log("Test message endpoint returned success (Telegram properly configured)")
                    else:
                        self.log(f"Test message endpoint returned expected error: {data.get('error', 'Unknown error')}")
                    return True
            
            self.log(f"Test message endpoint failed unexpectedly: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Test message endpoint test failed: {e}")
            return False
    
    def test_telegram_dispatch_endpoint(self) -> bool:
        """Test POST /api/admin/connections/telegram/dispatch"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/admin/connections/telegram/dispatch",
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                },
                json={'dryRun': True, 'limit': 10}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    dispatch_result = data['data']
                    # Check for expected dispatch result fields
                    expected_fields = ['sent', 'skipped', 'failed']
                    has_result_fields = all(field in dispatch_result for field in expected_fields)
                    
                    if has_result_fields:
                        self.log(f"Dispatch result: sent={dispatch_result.get('sent')}, skipped={dispatch_result.get('skipped')}, failed={dispatch_result.get('failed')}")
                        return True
                    else:
                        self.log(f"Dispatch result missing fields: {dispatch_result.keys()}")
                        return False
            
            self.log(f"Dispatch endpoint failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            self.log(f"Dispatch endpoint test failed: {e}")
            return False
    
    def test_telegram_alert_types_configuration(self) -> bool:
        """Test that all required alert types are configurable"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/telegram/settings",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    settings = data['data']
                    
                    # Check for required alert types
                    required_types = ['EARLY_BREAKOUT', 'STRONG_ACCELERATION', 'TREND_REVERSAL']
                    type_enabled = settings.get('type_enabled', {})
                    cooldown_hours = settings.get('cooldown_hours', {})
                    
                    # Verify all required types are present in both configs
                    types_in_enabled = all(alert_type in type_enabled for alert_type in required_types)
                    types_in_cooldown = all(alert_type in cooldown_hours for alert_type in required_types)
                    
                    if types_in_enabled and types_in_cooldown:
                        self.log(f"All required alert types configured: {required_types}")
                        return True
                    else:
                        missing_enabled = [t for t in required_types if t not in type_enabled]
                        missing_cooldown = [t for t in required_types if t not in cooldown_hours]
                        self.log(f"Missing alert types - enabled: {missing_enabled}, cooldown: {missing_cooldown}")
                        return False
            
            return False
        except Exception as e:
            self.log(f"Alert types configuration test failed: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Telegram notifications tests and return results"""
        self.log("🚀 Starting Phase 2.3: Telegram Alerts Delivery Testing")
        self.log(f"Testing against: {self.base_url}")
        
        # Admin Authentication
        admin_login_success = self.run_test("Admin login (admin/admin12345)", self.admin_login)
        
        if admin_login_success:
            # Telegram Settings Tests
            self.run_test("GET /api/admin/connections/telegram/settings returns settings", self.test_telegram_settings_get)
            self.run_test("PATCH /api/admin/connections/telegram/settings updates settings", self.test_telegram_settings_patch)
            
            # Telegram Stats and History Tests
            self.run_test("GET /api/admin/connections/telegram/stats returns statistics", self.test_telegram_stats_get)
            self.run_test("GET /api/admin/connections/telegram/history returns history", self.test_telegram_history_get)
            
            # Telegram Action Tests
            self.run_test("POST /api/admin/connections/telegram/test endpoint responds properly", self.test_telegram_test_message_endpoint)
            self.run_test("POST /api/admin/connections/telegram/dispatch works with dry run", self.test_telegram_dispatch_endpoint)
            
            # Configuration Tests
            self.run_test("All required alert types (EARLY_BREAKOUT, STRONG_ACCELERATION, TREND_REVERSAL) are configurable", self.test_telegram_alert_types_configuration)
        else:
            self.log("⚠️ Skipping Telegram tests due to admin login failure", "WARNING")
        
        # Results Summary
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        self.log(f"\n📊 Phase 2.3 Telegram Test Results:")
        self.log(f"✅ Passed: {self.tests_passed}/{self.tests_run} ({success_rate:.1f}%)")
        
        if self.failed_tests:
            self.log(f"❌ Failed Tests:")
            for failure in self.failed_tests:
                self.log(f"   - {failure}")
        
        return {
            'tests_run': self.tests_run,
            'tests_passed': self.tests_passed,
            'success_rate': success_rate,
            'failed_tests': self.failed_tests,
            'admin_token_obtained': self.admin_token is not None
        }

def main():
    """Main test execution"""
    tester = TelegramNotificationsTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results['success_rate'] >= 80:
        print(f"\n🎉 Phase 2.3 Telegram tests PASSED with {results['success_rate']:.1f}% success rate")
        return 0
    else:
        print(f"\n💥 Phase 2.3 Telegram tests FAILED with {results['success_rate']:.1f}% success rate")
        return 1

if __name__ == "__main__":
    sys.exit(main())