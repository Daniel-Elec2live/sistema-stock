"""
🧪 TESTS PARA FUNCIONES DE PARSING OCR
Tests unitarios para validar la extracción de datos
"""

import pytest
import sys
import os

# Añadir el directorio padre al path para importar main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import parse_supplier_info, parse_document_info, parse_products, ProveedorDetectado, DocumentoDetectado, ProductoDetectado


class TestSupplierParsing:
    """Tests para extracción de información de proveedores"""
    
    def test_parse_supplier_complete(self):
        """Test con información completa de proveedor"""
        text = """
        HUERTA DEL SUR S.L.
        C/ Industrial Las Vegas, 45
        29010 Málaga
        CIF: B-29123456
        Tel: +34 952 123 456
        Email: pedidos@huertadelsur.com
        """
        
        supplier = parse_supplier_info(text)
        
        assert supplier is not None
        assert "HUERTA DEL SUR" in supplier.nombre
        assert supplier.cif == "B-29123456"
        assert supplier.email == "pedidos@huertadelsur.com"
        assert supplier.telefono == "+34 952 123 456"
        assert supplier.confianza > 0.7
    
    def test_parse_supplier_minimal(self):
        """Test con información mínima de proveedor"""
        text = """
        CARNES SELECTAS
        B28456789
        """
        
        supplier = parse_supplier_info(text)
        
        assert supplier is not None
        assert supplier.nombre == "Carnes Selectas"
        assert supplier.cif == "B28456789"
        assert supplier.confianza > 0.5
    
    def test_parse_supplier_none(self):
        """Test sin información de proveedor"""
        text = "FACTURA 2024-001\nTotal: 125.50€"
        
        supplier = parse_supplier_info(text)
        assert supplier is None


class TestDocumentParsing:
    """Tests para extracción de información de documentos"""
    
    def test_parse_document_factura(self):
        """Test parsing de factura"""
        text = """
        FACTURA: FAC-2024-0891
        Fecha: 15/09/2024
        Total: 165.50€
        """
        
        doc = parse_document_info(text)
        
        assert doc is not None
        assert doc.tipo == "factura"
        assert doc.numero == "FAC-2024-0891"
        assert doc.fecha == "2024-09-15"
        assert doc.total == 165.50
    
    def test_parse_document_albaran(self):
        """Test parsing de albarán"""
        text = """
        ALBARÁN DE ENTREGA
        Nº: ALB-2024-1205
        12/09/2024
        """
        
        doc = parse_document_info(text)
        
        assert doc is not None
        assert doc.tipo == "albarán"
        assert doc.numero == "ALB-2024-1205"
        assert doc.fecha == "2024-09-12"
    
    def test_parse_document_date_formats(self):
        """Test diferentes formatos de fecha"""
        test_cases = [
            ("Fecha: 15/09/2024", "2024-09-15"),
            ("2024-09-15", "2024-09-15"),
            ("15-09-2024", "2024-09-15"),
        ]
        
        for text, expected_date in test_cases:
            doc = parse_document_info(text)
            assert doc.fecha == expected_date


class TestProductParsing:
    """Tests para extracción de productos"""
    
    def test_parse_products_vegetables(self):
        """Test parsing de productos vegetales"""
        text = """
        Tomate Cherry 5.5 kg 3.80€
        Rúcula bolsa 10 ud 2.20€
        Calabacín 12.5 kg 2.10€
        """
        
        products = parse_products(text)
        
        assert len(products) >= 2
        
        tomate = next((p for p in products if "tomate" in p.nombre.lower()), None)
        assert tomate is not None
        assert tomate.cantidad == 5.5
        assert tomate.unidad == "kg"
        assert tomate.precio == 3.80
        assert tomate.confianza > 0.7
    
    def test_parse_products_meat(self):
        """Test parsing de productos cárnicos"""
        text = """
        Solomillo de Ternera 2.5 kg 28.50€/kg
        Pechuga de Pollo 3.0 kg 8.90€
        """
        
        products = parse_products(text)
        
        assert len(products) >= 1
        
        solomillo = next((p for p in products if "solomillo" in p.nombre.lower()), None)
        assert solomillo is not None
        assert solomillo.cantidad == 2.5
        assert solomillo.unidad == "kg"
    
    def test_parse_products_duplicates(self):
        """Test eliminación de productos duplicados"""
        text = """
        Tomate Cherry 5.5 kg
        TOMATE CHERRY 5.5 kg
        Tomate cherry extra 5.5 kg
        """
        
        products = parse_products(text)
        
        # Debe eliminar duplicados similares
        tomate_products = [p for p in products if "tomate" in p.nombre.lower()]
        assert len(tomate_products) == 1
    
    def test_parse_products_confidence(self):
        """Test niveles de confianza"""
        text = """
        Tomate Cherry 5.5 kg 3.80€
        XRTQ123 2.0 ud
        """
        
        products = parse_products(text)
        
        tomate = next((p for p in products if "tomate" in p.nombre.lower()), None)
        unknown = next((p for p in products if "XRTQ" in p.nombre), None)
        
        # Tomate debe tener mayor confianza por ser palabra clave conocida
        if tomate and unknown:
            assert tomate.confianza > unknown.confianza


class TestIntegrationParsing:
    """Tests de integración completa"""
    
    def test_parse_complete_invoice(self):
        """Test parsing de factura completa real"""
        text = """
        HUERTA DEL SUR S.L.
        Polígono Industrial Las Vegas
        29010 Málaga
        CIF: B-29123456
        Tel: 952 123 456
        
        FACTURA: HDS-2024-0891
        Fecha: 15/09/2024
        
        Cliente: LA TRAVIATA S.L.
        
        PRODUCTOS:
        Tomate Cherry        5.50 kg    3.80€    20.90€
        Rúcula bolsa        10.00 ud    2.20€    22.00€
        Calabacín           12.50 kg    2.10€    26.25€
        
        TOTAL: 69.15€
        """
        
        # Test proveedor
        supplier = parse_supplier_info(text)
        assert supplier is not None
        assert "HUERTA DEL SUR" in supplier.nombre
        assert supplier.cif == "B-29123456"
        
        # Test documento
        doc = parse_document_info(text)
        assert doc is not None
        assert doc.tipo == "factura"
        assert doc.numero == "HDS-2024-0891"
        assert doc.fecha == "2024-09-15"
        assert doc.total == 69.15
        
        # Test productos
        products = parse_products(text)
        assert len(products) >= 3
        
        product_names = [p.nombre.lower() for p in products]
        assert any("tomate" in name for name in product_names)
        assert any("rucula" in name or "rúcula" in name for name in product_names)
        assert any("calabacin" in name or "calabacín" in name for name in product_names)


if __name__ == "__main__":
    # Ejecutar tests
    pytest.main([__file__, "-v", "--tb=short"])