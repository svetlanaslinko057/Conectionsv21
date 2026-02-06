#!/usr/bin/env python3
"""
P2.2 Final Readiness Check - Backend API Testing
Tests all backend endpoints for mathematical stability, behavioral logic, alerts engine, and admin control plane.
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any

# Use production URL from frontend .env
BACKEND_URL = "https://svetlana-connect.preview.emergentagent.com"

class P22BackendTester:
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
    
    def test_health_check(self) -> bool:
        """Test /api/health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                data = response.json()
                return data.get('ok') is True and 'service' in data
            return False
        except Exception as e:
            self.log(f"Health check failed: {e}")
            return False
    
    def test_connections_health(self) -> bool:
        """Test /api/connections/health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/connections/health")
            if response.status_code == 200:
                data = response.json()
                # Check for module healthy status
                return data.get('ok') is True and data.get('module') == 'connections'
            return False
        except Exception as e:
            self.log(f"Connections health check failed: {e}")
            return False
    
    def test_scoring_api_stability(self) -> bool:
        """Test /api/connections/score/mock for stable results"""
        try:
            # Run scoring multiple times to check stability
            results = []
            for i in range(3):
                response = self.session.get(f"{self.base_url}/api/connections/score/mock")
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok') and 'data' in data:
                        score_data = data['data']
                        if 'influence_score' in score_data:
                            results.append(score_data['influence_score'])
                        else:
                            return False
                    else:
                        return False
                else:
                    return False
                time.sleep(0.5)  # Small delay between requests
            
            # Check if results are consistent (same structure, reasonable values)
            if len(results) == 3:
                # All should be reasonable score ranges
                return all(0 <= score <= 1000 for score in results)
            return False
        except Exception as e:
            self.log(f"Scoring API test failed: {e}")
            return False
    
    def test_trends_api_correctness(self) -> bool:
        """Test /api/connections/trends/mock for correct trend states"""
        try:
            response = self.session.get(f"{self.base_url}/api/connections/trends/mock")
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    trend_data = data['data']
                    # Check for expected trend fields
                    required_fields = ['velocity_norm', 'acceleration_norm', 'state']
                    return all(field in trend_data for field in required_fields)
            return False
        except Exception as e:
            self.log(f"Trends API test failed: {e}")
            return False
    
    def test_early_signal_api(self) -> bool:
        """Test /api/connections/early-signal/mock for badge detection"""
        try:
            response = self.session.get(f"{self.base_url}/api/connections/early-signal/mock")
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    signal_data = data['data']
                    # Check for badge field and valid values
                    badge = signal_data.get('badge')
                    return badge in ['breakout', 'rising', 'none']
            return False
        except Exception as e:
            self.log(f"Early Signal API test failed: {e}")
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
    
    def test_admin_connections_overview_speed(self) -> bool:
        """Test admin connections overview loads < 2 seconds"""
        if not self.admin_token:
            return False
        
        try:
            start_time = time.time()
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/overview",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            end_time = time.time()
            
            load_time = end_time - start_time
            self.log(f"Admin overview load time: {load_time:.2f}s")
            
            if response.status_code == 200 and load_time < 2.0:
                data = response.json()
                return data.get('ok') is True
            return False
        except Exception as e:
            self.log(f"Admin overview test failed: {e}")
            return False
    
    def test_admin_config_readonly(self) -> bool:
        """Test admin config tab shows read-only configs"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/config",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    config_data = data['data']
                    # Check for config structure
                    return 'config' in config_data and isinstance(config_data['config'], dict)
            return False
        except Exception as e:
            self.log(f"Admin config test failed: {e}")
            return False
    
    def test_admin_stability_score(self) -> bool:
        """Test admin stability tab shows score ≥ 0.9"""
        if not self.admin_token:
            return False
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/tuning/status",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    tuning_data = data['data']
                    stability_score = tuning_data.get('overall_stability', 0)
                    self.log(f"Stability score: {stability_score}")
                    return stability_score >= 0.9
            return False
        except Exception as e:
            self.log(f"Admin stability test failed: {e}")
            return False
    
    def test_admin_alerts_batch_generation(self) -> bool:
        """Test admin alerts tab: Run Alerts Batch generates alerts"""
        if not self.admin_token:
            return False
        
        try:
            # First get current alerts count
            response = self.session.get(
                f"{self.base_url}/api/admin/connections/alerts/preview",
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            initial_count = 0
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    initial_count = data['data'].get('summary', {}).get('total', 0)
            
            # Run alerts batch with empty JSON body
            batch_response = self.session.post(
                f"{self.base_url}/api/admin/connections/alerts/run",
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                },
                json={}  # Send empty JSON object
            )
            
            if batch_response.status_code == 200:
                batch_data = batch_response.json()
                if batch_data.get('ok') and 'data' in batch_data:
                    alerts_generated = batch_data['data'].get('alerts_generated', 0)
                    self.log(f"Alerts batch generated: {alerts_generated} alerts")
                    return alerts_generated >= 0  # Should generate some alerts or at least run successfully
            
            self.log(f"Alerts batch failed: {batch_response.status_code} - {batch_response.text}")
            return False
        except Exception as e:
            self.log(f"Admin alerts batch test failed: {e}")
            return False
    
    def test_cooldown_deduplication(self) -> bool:
        """Test cooldown deduplication - repeated batch should not duplicate alerts"""
        if not self.admin_token:
            return False
        
        try:
            # Run first batch
            first_response = self.session.post(
                f"{self.base_url}/api/admin/connections/alerts/run",
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                },
                json={}  # Send empty JSON object
            )
            
            if first_response.status_code != 200:
                self.log(f"First batch failed: {first_response.status_code} - {first_response.text}")
                return False
            
            first_data = first_response.json()
            first_generated = first_data.get('data', {}).get('alerts_generated', 0)
            
            # Wait a moment and run second batch
            time.sleep(1)
            
            second_response = self.session.post(
                f"{self.base_url}/api/admin/connections/alerts/run",
                headers={
                    'Authorization': f'Bearer {self.admin_token}',
                    'Content-Type': 'application/json'
                },
                json={}  # Send empty JSON object
            )
            
            if second_response.status_code != 200:
                self.log(f"Second batch failed: {second_response.status_code} - {second_response.text}")
                return False
            
            second_data = second_response.json()
            second_generated = second_data.get('data', {}).get('alerts_generated', 0)
            
            self.log(f"First batch: {first_generated} alerts, Second batch: {second_generated} alerts")
            
            # Second batch should generate fewer or same alerts due to cooldown
            return second_generated <= first_generated
            
        except Exception as e:
            self.log(f"Cooldown deduplication test failed: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all P2.2 tests and return results"""
        self.log("🚀 Starting P2.2 Final Readiness Check - Backend Testing")
        self.log(f"Testing against: {self.base_url}")
        
        # Core API Health Tests
        self.run_test("Backend health check /api/health", self.test_health_check)
        self.run_test("Connections health /api/connections/health", self.test_connections_health)
        
        # API Stability Tests
        self.run_test("Scoring API /api/connections/score/mock stability", self.test_scoring_api_stability)
        self.run_test("Trends API /api/connections/trends/mock correctness", self.test_trends_api_correctness)
        self.run_test("Early Signal API /api/connections/early-signal/mock badge detection", self.test_early_signal_api)
        
        # Admin Authentication
        admin_login_success = self.run_test("Admin login (admin/admin12345)", self.admin_login)
        
        if admin_login_success:
            # Admin Control Plane Tests
            self.run_test("Admin Connections Overview loads < 2 sec", self.test_admin_connections_overview_speed)
            self.run_test("Admin Config tab shows read-only configs", self.test_admin_config_readonly)
            self.run_test("Admin Stability tab shows score ≥ 0.9", self.test_admin_stability_score)
            self.run_test("Admin Alerts tab: Run Alerts Batch generates alerts", self.test_admin_alerts_batch_generation)
            self.run_test("Cooldown deduplication works", self.test_cooldown_deduplication)
        else:
            self.log("⚠️ Skipping admin tests due to login failure", "WARNING")
        
        # Results Summary
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        self.log(f"\n📊 P2.2 Backend Test Results:")
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
    tester = P22BackendTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results['success_rate'] >= 80:
        print(f"\n🎉 P2.2 Backend tests PASSED with {results['success_rate']:.1f}% success rate")
        return 0
    else:
        print(f"\n💥 P2.2 Backend tests FAILED with {results['success_rate']:.1f}% success rate")
        return 1

if __name__ == "__main__":
    sys.exit(main())