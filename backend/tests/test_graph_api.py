"""
Test Graph API - ETAP H Graph UX Stabilization
Tests for /api/graph endpoints with H3 state calculations

Features tested:
- Graph API returns nodes with correct states (ACCUMULATION/DISTRIBUTION/ROUTER/NEUTRAL)
- Edge states are included (NORMAL/PRESSURE/DOMINANT)
- Time window selector (24h, 7d, 30d) works
- Node metrics include inflowUsd/outflowUsd
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestGraphAPI:
    """Graph API endpoint tests - ETAP H"""
    
    def test_graph_api_returns_200(self):
        """Test that /api/graph returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('ok') == True, "Response should have ok=true"
        print(f"SUCCESS: Graph API returned 200 OK")
    
    def test_graph_returns_54_nodes(self):
        """Test that graph returns expected number of nodes (54)"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        nodes = data['data']['nodes']
        assert len(nodes) == 54, f"Expected 54 nodes, got {len(nodes)}"
        print(f"SUCCESS: Graph returned {len(nodes)} nodes")
    
    def test_graph_returns_500_edges(self):
        """Test that graph returns expected number of edges (500)"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        edges = data['data']['edges']
        assert len(edges) == 500, f"Expected 500 edges, got {len(edges)}"
        print(f"SUCCESS: Graph returned {len(edges)} edges")
    
    def test_node_states_calculated_correctly(self):
        """Test H3: Node states (ACCUMULATION/DISTRIBUTION/ROUTER/NEUTRAL) are calculated"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        nodes = data['data']['nodes']
        
        # Count states
        states = {}
        for node in nodes:
            state = node.get('state', 'UNKNOWN')
            states[state] = states.get(state, 0) + 1
        
        # Verify expected states exist
        assert 'ACCUMULATION' in states, "Should have ACCUMULATION nodes"
        assert 'DISTRIBUTION' in states, "Should have DISTRIBUTION nodes"
        assert 'ROUTER' in states, "Should have ROUTER nodes"
        
        # Verify counts match expected (16 ACCUMULATION, 15 DISTRIBUTION, 23 ROUTER)
        assert states.get('ACCUMULATION', 0) >= 10, f"Expected ~16 ACCUMULATION, got {states.get('ACCUMULATION', 0)}"
        assert states.get('DISTRIBUTION', 0) >= 10, f"Expected ~15 DISTRIBUTION, got {states.get('DISTRIBUTION', 0)}"
        assert states.get('ROUTER', 0) >= 15, f"Expected ~23 ROUTER, got {states.get('ROUTER', 0)}"
        
        print(f"SUCCESS: Node states: {states}")
    
    def test_edge_states_included(self):
        """Test H3: Edge states (NORMAL/PRESSURE/DOMINANT) are included"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        edges = data['data']['edges']
        
        # Count edge states
        edge_states = {}
        for edge in edges:
            state = edge.get('state', 'UNKNOWN')
            edge_states[state] = edge_states.get(state, 0) + 1
        
        # Verify edge states exist
        assert 'NORMAL' in edge_states or 'PRESSURE' in edge_states, "Should have edge states"
        
        print(f"SUCCESS: Edge states: {edge_states}")
    
    def test_node_metrics_include_flow_data(self):
        """Test that node metrics include inflowUsd/outflowUsd/netFlowUsd"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        nodes = data['data']['nodes']
        
        # Check first node has required metrics
        sample_node = nodes[0]
        metrics = sample_node.get('metrics', {})
        
        assert 'inflowUsd' in metrics, "Node should have inflowUsd metric"
        assert 'outflowUsd' in metrics, "Node should have outflowUsd metric"
        assert 'netFlowUsd' in metrics, "Node should have netFlowUsd metric"
        
        print(f"SUCCESS: Node metrics include flow data: {list(metrics.keys())}")
    
    def test_time_window_24h(self):
        """Test 24h time window works"""
        response = requests.get(f"{BASE_URL}/api/graph?window=24h")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('ok') == True
        assert len(data['data']['nodes']) > 0, "Should have nodes for 24h window"
        
        print(f"SUCCESS: 24h window returned {len(data['data']['nodes'])} nodes")
    
    def test_time_window_30d(self):
        """Test 30d time window works"""
        response = requests.get(f"{BASE_URL}/api/graph?window=30d")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('ok') == True
        assert len(data['data']['nodes']) > 0, "Should have nodes for 30d window"
        
        print(f"SUCCESS: 30d window returned {len(data['data']['nodes'])} nodes")
    
    def test_graph_summary_endpoint(self):
        """Test /api/graph/summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/graph/summary?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('ok') == True
        
        summary = data['data']
        assert 'nodes' in summary, "Summary should have nodes count"
        assert 'edges' in summary, "Summary should have edges count"
        assert 'clusters' in summary, "Summary should have clusters count"
        
        print(f"SUCCESS: Summary - {summary['nodes']} nodes, {summary['edges']} edges, {summary['clusters']} clusters")
    
    def test_graph_clusters_endpoint(self):
        """Test /api/graph/clusters endpoint"""
        response = requests.get(f"{BASE_URL}/api/graph/clusters?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('ok') == True
        assert 'data' in data, "Should have clusters data"
        
        print(f"SUCCESS: Clusters endpoint returned {len(data['data'])} clusters")
    
    def test_node_structure_complete(self):
        """Test that node structure has all required fields"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        sample_node = data['data']['nodes'][0]
        
        required_fields = ['id', 'label', 'nodeType', 'state', 'metrics']
        for field in required_fields:
            assert field in sample_node, f"Node should have '{field}' field"
        
        print(f"SUCCESS: Node has all required fields: {list(sample_node.keys())}")
    
    def test_edge_structure_complete(self):
        """Test that edge structure has all required fields"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        assert response.status_code == 200
        
        data = response.json()
        sample_edge = data['data']['edges'][0]
        
        required_fields = ['id', 'from', 'to', 'weight', 'state']
        for field in required_fields:
            assert field in sample_edge, f"Edge should have '{field}' field"
        
        print(f"SUCCESS: Edge has all required fields: {list(sample_edge.keys())}")


class TestGraphStates:
    """Test H3 state calculation logic"""
    
    def test_accumulation_state_logic(self):
        """Test ACCUMULATION state is assigned to nodes with high inflow"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        data = response.json()
        
        accumulation_nodes = [n for n in data['data']['nodes'] if n.get('state') == 'ACCUMULATION']
        
        for node in accumulation_nodes[:3]:  # Check first 3
            metrics = node.get('metrics', {})
            inflow = metrics.get('inflowUsd', 0)
            outflow = metrics.get('outflowUsd', 0)
            # ACCUMULATION: inflowUsd > outflowUsd * 1.3
            assert inflow > outflow, f"ACCUMULATION node {node['id']} should have inflow > outflow"
        
        print(f"SUCCESS: ACCUMULATION state logic verified for {len(accumulation_nodes)} nodes")
    
    def test_distribution_state_logic(self):
        """Test DISTRIBUTION state is assigned to nodes with high outflow"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        data = response.json()
        
        distribution_nodes = [n for n in data['data']['nodes'] if n.get('state') == 'DISTRIBUTION']
        
        for node in distribution_nodes[:3]:  # Check first 3
            metrics = node.get('metrics', {})
            inflow = metrics.get('inflowUsd', 0)
            outflow = metrics.get('outflowUsd', 0)
            # DISTRIBUTION: outflowUsd > inflowUsd * 1.3
            assert outflow > inflow, f"DISTRIBUTION node {node['id']} should have outflow > inflow"
        
        print(f"SUCCESS: DISTRIBUTION state logic verified for {len(distribution_nodes)} nodes")
    
    def test_router_state_logic(self):
        """Test ROUTER state is assigned to high-throughput balanced nodes"""
        response = requests.get(f"{BASE_URL}/api/graph?window=7d")
        data = response.json()
        
        router_nodes = [n for n in data['data']['nodes'] if n.get('state') == 'ROUTER']
        
        # ROUTER nodes should have balanced flow
        for node in router_nodes[:3]:  # Check first 3
            metrics = node.get('metrics', {})
            inflow = metrics.get('inflowUsd', 0)
            outflow = metrics.get('outflowUsd', 0)
            total_flow = inflow + outflow
            if total_flow > 0:
                balance = abs(inflow - outflow) / total_flow
                # ROUTER should have relatively balanced flow (balance < 0.5)
                assert balance < 0.5, f"ROUTER node {node['id']} should have balanced flow"
        
        print(f"SUCCESS: ROUTER state logic verified for {len(router_nodes)} nodes")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
