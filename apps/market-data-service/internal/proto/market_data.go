package proto

// This file contains hand-written Go types that match the proto definition.
// In a production setup, you would use 'protoc' to generate this code from
// contracts/grpc/market_data.proto. For now, we define compatible types manually
// to avoid requiring protoc installation on every developer machine.
//
// The gRPC service is implemented in internal/grpc/quote_server.go

import (
	"context"

	"google.golang.org/grpc"
)

// QuoteRequest matches the proto QuoteRequest message
type QuoteRequest struct {
	Symbol string `protobuf:"bytes,1,opt,name=symbol,proto3" json:"symbol,omitempty"`
}

func (m *QuoteRequest) Reset()         {}
func (m *QuoteRequest) String() string { return m.Symbol }
func (m *QuoteRequest) ProtoMessage()  {}

// QuoteResponse matches the proto QuoteResponse message
type QuoteResponse struct {
	Symbol             string `protobuf:"bytes,1,opt,name=symbol,proto3" json:"symbol,omitempty"`
	PricePaise         int64  `protobuf:"varint,2,opt,name=price_paise,json=pricePaise,proto3" json:"pricePaise,omitempty"`
	PreviousPricePaise int64  `protobuf:"varint,3,opt,name=previous_price_paise,json=previousPricePaise,proto3" json:"previousPricePaise,omitempty"`
	Timestamp          string `protobuf:"bytes,4,opt,name=timestamp,proto3" json:"timestamp,omitempty"`
	MarketActive       bool   `protobuf:"varint,5,opt,name=market_active,json=marketActive,proto3" json:"marketActive,omitempty"`
	Volume             int64  `protobuf:"varint,6,opt,name=volume,proto3" json:"volume,omitempty"`
}

func (m *QuoteResponse) Reset()         {}
func (m *QuoteResponse) String() string { return m.Symbol }
func (m *QuoteResponse) ProtoMessage()  {}

// MultiQuoteRequest matches the proto MultiQuoteRequest message
type MultiQuoteRequest struct {
	Symbols []string `protobuf:"bytes,1,rep,name=symbols,proto3" json:"symbols,omitempty"`
}

func (m *MultiQuoteRequest) Reset()         {}
func (m *MultiQuoteRequest) String() string { return "MultiQuoteRequest" }
func (m *MultiQuoteRequest) ProtoMessage()  {}

// MultiQuoteResponse matches the proto MultiQuoteResponse message
type MultiQuoteResponse struct {
	Quotes []*QuoteResponse `protobuf:"bytes,1,rep,name=quotes,proto3" json:"quotes,omitempty"`
}

func (m *MultiQuoteResponse) Reset()         {}
func (m *MultiQuoteResponse) String() string { return "MultiQuoteResponse" }
func (m *MultiQuoteResponse) ProtoMessage()  {}

// QuoteServiceServer is the server API for QuoteService
type QuoteServiceServer interface {
	GetQuote(context.Context, *QuoteRequest) (*QuoteResponse, error)
	GetQuotes(context.Context, *MultiQuoteRequest) (*MultiQuoteResponse, error)
}

// UnimplementedQuoteServiceServer provides default implementations
type UnimplementedQuoteServiceServer struct{}

func (UnimplementedQuoteServiceServer) GetQuote(context.Context, *QuoteRequest) (*QuoteResponse, error) {
	return nil, nil
}

func (UnimplementedQuoteServiceServer) GetQuotes(context.Context, *MultiQuoteRequest) (*MultiQuoteResponse, error) {
	return nil, nil
}

// QuoteServiceClient is the client API for QuoteService
type QuoteServiceClient interface {
	GetQuote(ctx context.Context, in *QuoteRequest, opts ...grpc.CallOption) (*QuoteResponse, error)
	GetQuotes(ctx context.Context, in *MultiQuoteRequest, opts ...grpc.CallOption) (*MultiQuoteResponse, error)
}

// Service description for gRPC registration
var QuoteService_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "marketdata.QuoteService",
	HandlerType: (*QuoteServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetQuote",
			Handler:    _QuoteService_GetQuote_Handler,
		},
		{
			MethodName: "GetQuotes",
			Handler:    _QuoteService_GetQuotes_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "market_data.proto",
}

func _QuoteService_GetQuote_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QuoteRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QuoteServiceServer).GetQuote(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/marketdata.QuoteService/GetQuote",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QuoteServiceServer).GetQuote(ctx, req.(*QuoteRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _QuoteService_GetQuotes_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MultiQuoteRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QuoteServiceServer).GetQuotes(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/marketdata.QuoteService/GetQuotes",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QuoteServiceServer).GetQuotes(ctx, req.(*MultiQuoteRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// RegisterQuoteServiceServer registers the QuoteService server
func RegisterQuoteServiceServer(s *grpc.Server, srv QuoteServiceServer) {
	s.RegisterService(&QuoteService_ServiceDesc, srv)
}
