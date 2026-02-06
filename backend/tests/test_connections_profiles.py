"""
Test Connections Scoring Profiles and Compare Explain Engine
Tests: Profile detection, profile-specific weights, compare explain API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConnectionsProfiles:
    """Test scoring profiles configuration endpoint"""
    
    def test_get_profiles_returns_all_three(self):
        """GET /api/connections/profiles returns retail, influencer, whale"""
        response = requests.get(f"{BASE_URL}/api/connections/profiles")
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert len(data['data']) == 3
        
        profile_types = [p['type'] for p in data['data']]
        assert 'retail' in profile_types
        assert 'influencer' in profile_types
        assert 'whale' in profile_types
    
    def test_profiles_have_correct_thresholds(self):
        """Verify profile thresholds: retail <50K, influencer 50K-500K, whale >500K"""
        response = requests.get(f"{BASE_URL}/api/connections/profiles")
        data = response.json()
        
        profiles = {p['type']: p for p in data['data']}
        
        # Retail: 0 to 50K
        assert profiles['retail']['thresholds']['min'] == 0
        assert profiles['retail']['thresholds']['max'] == 50000
        
        # Influencer: 50K to 500K
        assert profiles['influencer']['thresholds']['min'] == 50000
        assert profiles['influencer']['thresholds']['max'] == 500000
        
        # Whale: 500K+
        assert profiles['whale']['thresholds']['min'] == 500000
        assert profiles['whale']['thresholds']['max'] is None  # Infinity
    
    def test_profiles_have_weights(self):
        """Verify each profile has influence and x weights"""
        response = requests.get(f"{BASE_URL}/api/connections/profiles")
        data = response.json()
        
        for profile in data['data']:
            assert 'weights' in profile
            assert 'influence' in profile['weights']
            assert 'x' in profile['weights']
            
            # Influence weights
            inf_weights = profile['weights']['influence']
            assert 'rve' in inf_weights
            assert 're' in inf_weights
            assert 'eq' in inf_weights
            assert 'authority' in inf_weights
            
            # X weights
            x_weights = profile['weights']['x']
            assert 'pc' in x_weights
            assert 'es' in x_weights
            assert 'eq' in x_weights


class TestProfileDetection:
    """Test that scoring engine correctly detects profiles based on followers"""
    
    def test_retail_profile_under_50k(self):
        """Followers <50K should return retail profile"""
        response = requests.post(f"{BASE_URL}/api/connections/score", json={
            "author_id": "test_retail_detection",
            "window_days": 30,
            "followers_now": 10000,
            "posts": [
                {"views": 5000, "likes": 200, "reposts": 50, "replies": 30, "created_at": "2026-01-15T10:00:00Z"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert data['data']['profile'] == 'retail'
        assert data['data']['explain']['profile']['type'] == 'retail'
    
    def test_influencer_profile_50k_to_500k(self):
        """Followers 50K-500K should return influencer profile"""
        response = requests.post(f"{BASE_URL}/api/connections/score", json={
            "author_id": "test_influencer_detection",
            "window_days": 30,
            "followers_now": 150000,
            "posts": [
                {"views": 50000, "likes": 2000, "reposts": 500, "replies": 300, "created_at": "2026-01-15T10:00:00Z"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert data['data']['profile'] == 'influencer'
        assert data['data']['explain']['profile']['type'] == 'influencer'
    
    def test_whale_profile_over_500k(self):
        """Followers >500K should return whale profile"""
        response = requests.post(f"{BASE_URL}/api/connections/score", json={
            "author_id": "test_whale_detection",
            "window_days": 30,
            "followers_now": 800000,
            "posts": [
                {"views": 200000, "likes": 5000, "reposts": 1200, "replies": 800, "created_at": "2026-01-15T10:00:00Z"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert data['data']['profile'] == 'whale'
        assert data['data']['explain']['profile']['type'] == 'whale'
    
    def test_boundary_50k_is_influencer(self):
        """Exactly 50K followers should be influencer (not retail)"""
        response = requests.post(f"{BASE_URL}/api/connections/score", json={
            "author_id": "test_boundary_50k",
            "window_days": 30,
            "followers_now": 50000,
            "posts": [
                {"views": 20000, "likes": 800, "reposts": 200, "replies": 100, "created_at": "2026-01-15T10:00:00Z"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['data']['profile'] == 'influencer'
    
    def test_boundary_500k_is_whale(self):
        """Exactly 500K followers should be whale (not influencer)"""
        response = requests.post(f"{BASE_URL}/api/connections/score", json={
            "author_id": "test_boundary_500k",
            "window_days": 30,
            "followers_now": 500000,
            "posts": [
                {"views": 100000, "likes": 3000, "reposts": 700, "replies": 400, "created_at": "2026-01-15T10:00:00Z"}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['data']['profile'] == 'whale'


class TestScoreMock:
    """Test mock score endpoint"""
    
    def test_mock_returns_profile_field(self):
        """GET /api/connections/score/mock should return profile field"""
        response = requests.get(f"{BASE_URL}/api/connections/score/mock")
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert 'profile' in data['data']
        assert data['data']['profile'] in ['retail', 'influencer', 'whale']
    
    def test_mock_returns_explain_with_profile(self):
        """Mock should include profile info in explain"""
        response = requests.get(f"{BASE_URL}/api/connections/score/mock")
        data = response.json()
        
        assert 'explain' in data['data']
        assert 'profile' in data['data']['explain']
        assert 'type' in data['data']['explain']['profile']
        assert 'name' in data['data']['explain']['profile']
        assert 'thresholds' in data['data']['explain']['profile']
    
    def test_mock_returns_weights(self):
        """Mock should include weights in explain"""
        response = requests.get(f"{BASE_URL}/api/connections/score/mock")
        data = response.json()
        
        assert 'weights' in data['data']['explain']
        assert 'influence' in data['data']['explain']['weights']
        assert 'x' in data['data']['explain']['weights']


class TestCompareExplain:
    """Test compare explain engine"""
    
    def test_compare_explain_returns_winner(self):
        """POST /api/connections/compare/explain should return winner"""
        response = requests.post(f"{BASE_URL}/api/connections/compare/explain", json={
            "a": {
                "author_id": "account_a",
                "window_days": 30,
                "followers_now": 100000,
                "posts": [
                    {"views": 50000, "likes": 2000, "reposts": 500, "replies": 300, "created_at": "2026-01-15T10:00:00Z"}
                ]
            },
            "b": {
                "author_id": "account_b",
                "window_days": 30,
                "followers_now": 80000,
                "posts": [
                    {"views": 30000, "likes": 1000, "reposts": 200, "replies": 150, "created_at": "2026-01-15T10:00:00Z"}
                ]
            },
            "score_type": "influence"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert 'explanation' in data['data']
        assert data['data']['explanation']['winner'] in ['A', 'B', 'TIE']
    
    def test_compare_explain_returns_scores(self):
        """Compare should return both scores with profiles"""
        response = requests.post(f"{BASE_URL}/api/connections/compare/explain", json={
            "a": {
                "author_id": "account_a",
                "window_days": 30,
                "followers_now": 100000,
                "posts": [
                    {"views": 50000, "likes": 2000, "reposts": 500, "replies": 300, "created_at": "2026-01-15T10:00:00Z"}
                ]
            },
            "b": {
                "author_id": "account_b",
                "window_days": 30,
                "followers_now": 80000,
                "posts": [
                    {"views": 30000, "likes": 1000, "reposts": 200, "replies": 150, "created_at": "2026-01-15T10:00:00Z"}
                ]
            }
        })
        data = response.json()
        
        assert 'scores' in data['data']
        assert 'a' in data['data']['scores']
        assert 'b' in data['data']['scores']
        
        # Both should have profile field
        assert 'profile' in data['data']['scores']['a']
        assert 'profile' in data['data']['scores']['b']
    
    def test_compare_explain_returns_drivers(self):
        """Compare should return positive and negative drivers"""
        response = requests.post(f"{BASE_URL}/api/connections/compare/explain", json={
            "a": {
                "author_id": "account_a",
                "window_days": 30,
                "followers_now": 100000,
                "posts": [
                    {"views": 50000, "likes": 2000, "reposts": 500, "replies": 300, "created_at": "2026-01-15T10:00:00Z"}
                ]
            },
            "b": {
                "author_id": "account_b",
                "window_days": 30,
                "followers_now": 80000,
                "posts": [
                    {"views": 30000, "likes": 1000, "reposts": 200, "replies": 150, "created_at": "2026-01-15T10:00:00Z"}
                ]
            }
        })
        data = response.json()
        
        assert 'drivers' in data['data']['explanation']
        assert 'positive' in data['data']['explanation']['drivers']
        assert 'negative' in data['data']['explanation']['drivers']
    
    def test_compare_explain_mock(self):
        """GET /api/connections/compare/explain/mock should work"""
        response = requests.get(f"{BASE_URL}/api/connections/compare/explain/mock")
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert 'scores' in data['data']
        assert 'explanation' in data['data']
        
        # Mock should show whale vs retail comparison
        assert data['data']['scores']['a']['profile'] == 'whale'
        assert data['data']['scores']['b']['profile'] == 'retail'
    
    def test_compare_explain_validation_missing_a(self):
        """Should return 400 if a is missing"""
        response = requests.post(f"{BASE_URL}/api/connections/compare/explain", json={
            "b": {
                "author_id": "account_b",
                "window_days": 30,
                "followers_now": 80000,
                "posts": []
            }
        })
        assert response.status_code == 400
    
    def test_compare_explain_validation_missing_posts(self):
        """Should return 400 if posts array is missing"""
        response = requests.post(f"{BASE_URL}/api/connections/compare/explain", json={
            "a": {
                "author_id": "account_a",
                "window_days": 30,
                "followers_now": 100000
            },
            "b": {
                "author_id": "account_b",
                "window_days": 30,
                "followers_now": 80000,
                "posts": []
            }
        })
        assert response.status_code == 400


class TestAccountsEndpoint:
    """Test accounts list endpoint"""
    
    def test_get_accounts_returns_list(self):
        """GET /api/connections/accounts should return items array"""
        response = requests.get(f"{BASE_URL}/api/connections/accounts?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data['ok'] is True
        assert 'items' in data['data']
        assert isinstance(data['data']['items'], list)
    
    def test_accounts_have_required_fields(self):
        """Each account should have author_id, handle, scores"""
        response = requests.get(f"{BASE_URL}/api/connections/accounts?limit=5")
        data = response.json()
        
        if len(data['data']['items']) > 0:
            account = data['data']['items'][0]
            assert 'author_id' in account
            assert 'handle' in account
            # scores may be present
            if 'scores' in account:
                assert 'influence_score' in account['scores'] or 'risk_level' in account['scores']


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
